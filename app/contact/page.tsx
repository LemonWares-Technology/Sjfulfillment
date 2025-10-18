'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  PhoneIcon, 
  EnvelopeIcon, 
  MapPinIcon, 
  ClockIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface ContactFormData {
  name: string
  email: string
  phone: string
  company: string
  subject: string
  message: string
  serviceType: string
}

export default function ContactPage() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: '',
    serviceType: 'general'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errors, setErrors] = useState<Partial<ContactFormData>>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name as keyof ContactFormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<ContactFormData> = {}
    
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid'
    if (!formData.message.trim()) newErrors.message = 'Message is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    
    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 2000))
      setIsSubmitted(true)
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        subject: '',
        message: '',
        serviceType: 'general'
      })
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check if form is valid for button state
  const isFormValid = formData.name.trim() !== '' && 
                     formData.email.trim() !== '' && 
                     formData.message.trim() !== '' &&
                     /\S+@\S+\.\S+/.test(formData.email)

  const contactInfo = [
    {
      icon: PhoneIcon,
      title: 'Phone',
      details: ['+2349032564740', '+2349014199182'],
      action: 'tel:+2349032564740'
    },
    {
      icon: EnvelopeIcon,
      title: 'Email',
      details: ['enquiries@sjfulfillment.com', 'support@sjfulfillment.com'],
      action: 'mailto:enquiries@sjfulfillment.com'
    },
    {
      icon: MapPinIcon,
      title: 'Office Locations',
      details: ['Lagos, Nigeria', 'Abuja, Nigeria', 'Port Harcourt, Nigeria'],
      action: null
    },
    {
      icon: ClockIcon,
      title: 'Business Hours',
      details: ['Monday - Friday: 8:00 AM - 6:00 PM', 'Saturday: 9:00 AM - 4:00 PM', 'Sunday: Closed'],
      action: null
    }
  ]

  const serviceTypes = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'fulfillment', label: 'Fulfillment Services' },
    { value: 'warehouse', label: 'Warehouse & Storage' },
    { value: 'delivery', label: 'Last Mile Delivery' },
    { value: 'integration', label: 'Platform Integration' },
    { value: 'support', label: 'Technical Support' },
    { value: 'partnership', label: 'Partnership' }
  ]

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
        <div className="max-w-md mx-auto text-center px-4">
          <div className="bg-gradient-to-r from-gray-800 to-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4 text-[#F08C17]">Message Sent Successfully!</h2>
            <p className="text-gray-300 mb-6">
              Thank you for contacting us. We'll get back to you within 24 hours.
            </p>
            <button
              onClick={() => setIsSubmitted(false)}
              className="bg-[#F08C17] text-black px-6 py-3 rounded-[5px] font-semibold hover:bg-[#e67e0a] transition-colors duration-300"
            >
              Send Another Message
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* Header */}
      <header className="bg-[#141414] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center">
              <Image 
                src="https://sjfulfillment.com/wp-content/uploads/2020/09/cropped-Main-Logo-white-886x.png" 
                alt="SJF Logo" 
                width={150} 
                height={100} 
                className="h-12 w-auto"
              />
            </Link>
            <Link 
              href="/welcome"
              className="text-[#F08C17] hover:text-white transition-colors duration-300"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 text-[#F08C17]">Contact Us</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Ready to transform your fulfillment operations? Get in touch with our team of experts. 
            We're here to help you scale your business across Nigeria.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="tel:+2349032564740" 
              className="bg-[#F08C17] text-black px-8 py-4 rounded-[5px] font-semibold hover:bg-[#e67e0a] transition-colors duration-300 flex items-center justify-center"
            >
              <PhoneIcon className="h-5 w-5 mr-2" />
              Call Now: +2349032564740
            </a>
            <a 
              href="mailto:enquiries@sjfulfillment.com" 
              className="bg-transparent text-[#F08C17] border-2 border-[#F08C17] px-8 py-4 rounded-[5px] font-semibold hover:bg-[#F08C17] hover:text-black transition-colors duration-300 flex items-center justify-center"
            >
              <EnvelopeIcon className="h-5 w-5 mr-2" />
              Email Us
            </a>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8">
            <div className="flex items-center mb-6">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-[#F08C17] mr-3" />
              <h2 className="text-2xl font-bold text-[#F08C17]">Send us a Message</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 bg-gray-700/50 border rounded-[5px] focus:ring-2 focus:ring-[#F08C17] focus:border-transparent transition-colors ${
                      errors.name ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="Your full name"
                  />
                  {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 bg-gray-700/50 border rounded-[5px] focus:ring-2 focus:ring-[#F08C17] focus:border-transparent transition-colors ${
                      errors.email ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="your@email.com"
                  />
                  {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-[5px] focus:ring-2 focus:ring-[#F08C17] focus:border-transparent transition-colors"
                    placeholder="+234 xxx xxx xxxx"
                  />
                </div>
                
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-[5px] focus:ring-2 focus:ring-[#F08C17] focus:border-transparent transition-colors"
                    placeholder="Your company name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="serviceType" className="block text-sm font-medium text-gray-300 mb-2">
                  Service Interest
                </label>
                <select
                  id="serviceType"
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-[5px] focus:ring-2 focus:ring-[#F08C17] focus:border-transparent transition-colors"
                >
                  {serviceTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-[5px] focus:ring-2 focus:ring-[#F08C17] focus:border-transparent transition-colors"
                  placeholder="Brief subject line"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  value={formData.message}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-gray-700/50 border rounded-[5px] focus:ring-2 focus:ring-[#F08C17] focus:border-transparent transition-colors resize-none ${
                    errors.message ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="Tell us about your fulfillment needs, questions, or how we can help you..."
                />
                {errors.message && <p className="text-red-400 text-sm mt-1">{errors.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className={`w-full px-6 py-4 rounded-[5px] font-semibold transition-colors duration-300 flex items-center justify-center ${
                  isFormValid && !isSubmitting
                    ? 'bg-[#F08C17] text-black hover:bg-[#e67e0a]'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            {/* Contact Cards */}
            <div className="space-y-6">
              {contactInfo.map((info, index) => (
                <div key={index} className="bg-gradient-to-r from-gray-800 to-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:border-[#F08C17]/30 transition-all duration-300">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-[#F08C17]/20 rounded-[5px] flex items-center justify-center">
                        <info.icon className="h-6 w-6 text-[#F08C17]" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">{info.title}</h3>
                      <div className="space-y-1">
                        {info.details.map((detail, idx) => (
                          <p key={idx} className="text-gray-300 text-sm">
                            {detail}
                          </p>
                        ))}
                      </div>
                      {info.action && (
                        <a
                          href={info.action}
                          className="inline-block mt-3 text-[#F08C17] hover:text-white transition-colors duration-300 text-sm font-medium"
                        >
                          Click to {info.title.toLowerCase()}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-[#F08C17] mb-4">Why Choose SJF?</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">36</div>
                  <div className="text-sm text-gray-300">States Covered</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">24/7</div>
                  <div className="text-sm text-gray-300">Support</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">99%</div>
                  <div className="text-sm text-gray-300">Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">48hrs</div>
                  <div className="text-sm text-gray-300">Processing</div>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-gradient-to-r from-red-900/20 to-red-800/20 backdrop-blur-sm border border-red-700/50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-2">Emergency Support</h3>
              <p className="text-gray-300 text-sm mb-3">
                For urgent issues outside business hours, contact our emergency support line.
              </p>
              <a
                href="tel:+2349032564740"
                className="inline-flex items-center text-red-400 hover:text-red-300 transition-colors duration-300"
              >
                <PhoneIcon className="h-4 w-4 mr-2" />
                Emergency: +2349032564740
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
