import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { JWTPayload } from '@/app/lib/auth'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
} else {
  console.error('Cloudinary configuration missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.')
}

// POST /api/upload/image
export const POST = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF'], async (request: NextRequest, user: JWTPayload) => {
  try {
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return createErrorResponse('Cloudinary configuration missing. Please contact administrator.', 500)
    }
    const formData = await request.formData()
    
    // Handle multiple files
    const files = formData.getAll('files') as File[]
    const singleFile = formData.get('file') as File
    
    // Support both single file and multiple files
    const filesToUpload = files.length > 0 ? files : singleFile ? [singleFile] : []
    
    if (filesToUpload.length === 0) {
      return createErrorResponse('No files provided', 400)
    }

    // Validate file types and sizes
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const maxSize = 5 * 1024 * 1024 // 5MB
    const maxFiles = 10 // Maximum 10 files per upload

    if (filesToUpload.length > maxFiles) {
      return createErrorResponse(`Too many files. Maximum ${maxFiles} files allowed.`, 400)
    }

    for (const file of filesToUpload) {
      if (!allowedTypes.includes(file.type)) {
        return createErrorResponse(`Invalid file type: ${file.name}. Only JPEG, PNG, and WebP images are allowed.`, 400)
      }
      if (file.size > maxSize) {
        return createErrorResponse(`File too large: ${file.name}. Maximum size is 5MB.`, 400)
      }
    }

    // Upload files one by one to avoid timeout issues
    const uploadResults = []
    
    for (const file of filesToUpload) {
      try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'sjfulfillment/products',
              use_filename: true,
              unique_filename: true,
              overwrite: false,
              transformation: [
                { quality: 'auto' },
                { fetch_format: 'auto' }
              ],
              timeout: 30000 // 30 second timeout
            },
            (error: any, result: any) => {
              if (error) {
                console.error(`Upload error for ${file.name}:`, error)
                reject(error)
              } else {
                resolve({
                  url: result.secure_url,
                  publicId: result.public_id,
                  fileName: result.original_filename,
                  originalName: file.name,
                  size: file.size,
                  type: file.type,
                  width: result.width,
                  height: result.height
                })
              }
            }
          )
          
          // Set a timeout for the upload stream
          setTimeout(() => {
            uploadStream.destroy()
            reject(new Error(`Upload timeout for ${file.name}`))
          }, 25000) // 25 second timeout
          
          uploadStream.end(buffer)
        })

        uploadResults.push(uploadResult)
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error)
        // Continue with other files instead of failing completely
        uploadResults.push({
          error: `Failed to upload ${file.name}`,
          originalName: file.name,
          size: file.size,
          type: file.type
        })
      }
    }

    return createResponse({
      files: uploadResults,
      count: uploadResults.length
    }, 201, `${uploadResults.length} image(s) uploaded successfully`)

  } catch (error) {
    console.error('Image upload error:', error)
    return createErrorResponse('Failed to upload image', 500)
  }
})

