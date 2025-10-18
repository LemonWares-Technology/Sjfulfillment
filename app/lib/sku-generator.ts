import { prisma } from './prisma'

interface SKUGenerationOptions {
  warehouseCode: string
  category?: string
  merchantId: string
}

export class SKUGenerator {
  private static readonly WAREHOUSE_CODES: Record<string, string> = {
    'Lagos': 'LA',
    'Abuja': 'AB',
    'Kano': 'KN',
    'Port Harcourt': 'PH',
    'Ibadan': 'IB',
    'Kaduna': 'KD',
    'Maiduguri': 'MD',
    'Enugu': 'EN',
    'Abeokuta': 'ABK',
    'Jos': 'JS'
  }

  private static readonly CATEGORY_CODES: Record<string, string> = {
    'Electronics': 'ELC',
    'Clothing': 'CLT',
    'Food': 'FOD',
    'Books': 'BOK',
    'Home & Garden': 'HOM',
    'Sports': 'SPT',
    'Beauty': 'BTY',
    'Automotive': 'AUT',
    'Health': 'HLT',
    'Toys': 'TOY',
    'Office': 'OFF',
    'Jewelry': 'JWL',
    'Shoes': 'SHO',
    'Bags': 'BAG',
    'Watches': 'WAT'
  }

  /**
   * Generate a unique SKU for a product
   * Format: WH-{WAREHOUSE_CODE}/{CATEGORY_CODE}-{SEQUENCE_NUMBER}
   * Example: WH-LA/ELC-001, WH-AB/FOD-002
   */
  static async generateSKU(options: SKUGenerationOptions): Promise<string> {
    const { warehouseCode, category, merchantId } = options
    
    // Handle null/undefined warehouseCode
    const safeWarehouseCode = warehouseCode || 'Lagos'
    const whCode = this.WAREHOUSE_CODES[safeWarehouseCode] || safeWarehouseCode.substring(0, 2).toUpperCase()
    
    // Get category code
    const catCode = category ? this.CATEGORY_CODES[category] || category.substring(0, 3).toUpperCase() : 'GEN'
    
    // Find the next sequence number for this combination
    const prefix = `WH-${whCode}/${catCode}`
    
    try {
      // Get the highest sequence number for this prefix
      const lastProduct = await prisma.product.findFirst({
        where: {
          sku: {
            startsWith: prefix
          },
          merchantId
        },
        orderBy: {
          sku: 'desc'
        },
        select: {
          sku: true
        }
      })

      let sequenceNumber = 1
      if (lastProduct) {
        // Extract sequence number from last SKU
        const lastSequence = lastProduct.sku.split('-').pop()
        sequenceNumber = parseInt(lastSequence || '0') + 1
      }

      // Format sequence number with leading zeros
      const formattedSequence = sequenceNumber.toString().padStart(3, '0')
      
      return `${prefix}-${formattedSequence}`
    } catch (error) {
      console.error('Error generating SKU:', error)
      // Fallback to timestamp-based SKU
      const timestamp = Date.now().toString().slice(-6)
      return `${prefix}-${timestamp}`
    }
  }

  /**
   * Generate warehouse code
   * Format: WH-{CITY_CODE}-{SEQUENCE}
   * Example: WH-LA-01, WH-AB-02
   */
  static async generateWarehouseCode(city: string, state?: string): Promise<string> {
    // Handle null/undefined city
    if (!city || typeof city !== 'string') {
      city = 'Lagos' // Default fallback
    }
    
    const cityCode = this.WAREHOUSE_CODES[city] || city.substring(0, 2).toUpperCase()
    const prefix = `WH-${cityCode}`
    
    try {
      // Find the highest sequence number for this city
      const lastWarehouse = await prisma.warehouseLocation.findFirst({
        where: {
          code: {
            startsWith: prefix
          }
        },
        orderBy: {
          code: 'desc'
        },
        select: {
          code: true
        }
      })

      let sequenceNumber = 1
      if (lastWarehouse) {
        // Extract sequence number from last warehouse code
        const lastSequence = lastWarehouse.code.split('-').pop()
        sequenceNumber = parseInt(lastSequence || '0') + 1
      }

      // Format sequence number with leading zeros
      const formattedSequence = sequenceNumber.toString().padStart(2, '0')
      
      return `${prefix}-${formattedSequence}`
    } catch (error) {
      console.error('Error generating warehouse code:', error)
      // Fallback to timestamp-based code
      const timestamp = Date.now().toString().slice(-4)
      return `${prefix}-${timestamp}`
    }
  }

  /**
   * Generate zone code
   * Format: {ZONE_TYPE_CODE}-{SEQUENCE}
   * Example: ST-01, PK-02, SH-03
   */
  static async generateZoneCode(warehouseId: string, zoneType: string): Promise<string> {
    const zoneTypeCodes: { [key: string]: string } = {
      'STORAGE': 'ST',
      'PICKING': 'PK', 
      'PACKING': 'PA',
      'SHIPPING': 'SH',
      'RECEIVING': 'RC',
      'QUARANTINE': 'QT',
      'RETURNS': 'RT'
    }
    
    const typeCode = zoneTypeCodes[zoneType] || zoneType.substring(0, 2).toUpperCase()
    const prefix = typeCode
    
    try {
      // Find the highest sequence number for this zone type in the warehouse
      const lastZone = await prisma.warehouseZone.findFirst({
        where: {
          warehouseId,
          code: {
            startsWith: prefix
          }
        },
        orderBy: {
          code: 'desc'
        },
        select: {
          code: true
        }
      })

      let sequenceNumber = 1
      if (lastZone) {
        // Extract sequence number from last zone code
        const lastSequence = lastZone.code.split('-').pop()
        sequenceNumber = parseInt(lastSequence || '0') + 1
      }

      // Format sequence number with leading zeros
      const formattedSequence = sequenceNumber.toString().padStart(2, '0')
      
      return `${prefix}-${formattedSequence}`
    } catch (error) {
      console.error('Error generating zone code:', error)
      // Fallback to timestamp-based code
      const timestamp = Date.now().toString().slice(-4)
      return `${prefix}-${timestamp}`
    }
  }

  /**
   * Validate SKU format
   */
  static validateSKU(sku: string): boolean {
    const skuPattern = /^WH-[A-Z]{2,3}\/[A-Z]{3}-[0-9]{3}$/
    return skuPattern.test(sku)
  }

  /**
   * Extract information from SKU
   */
  static parseSKU(sku: string): { warehouse: string; category: string; sequence: number } | null {
    if (!this.validateSKU(sku)) {
      return null
    }

    const parts = sku.split('-')
    const warehouseCode = parts[1].split('/')[0]
    const categoryCode = parts[1].split('/')[1]
    const sequence = parseInt(parts[2])

    return {
      warehouse: warehouseCode,
      category: categoryCode,
      sequence
    }
  }

  /**
   * Get warehouse code for a city/state
   */
  static getWarehouseCode(location: string): string {
    return this.WAREHOUSE_CODES[location] || location.substring(0, 2).toUpperCase()
  }

  /**
   * Get category code
   */
  static getCategoryCode(category: string): string {
    return this.CATEGORY_CODES[category] || category.substring(0, 3).toUpperCase()
  }
}

export default SKUGenerator
