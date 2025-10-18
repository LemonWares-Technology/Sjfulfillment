'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { faqs } from '@/app/data/faq-data'

export default function FAQPage() {
  const [openFaq, setOpenFaq] = useState(0)

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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 text-[#F08C17]">Frequently Asked Questions</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Find answers to common questions about our fulfillment services, shipping, and support
          </p>
        </div>

        {/* FAQ Section */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-gradient-to-r from-gray-800 to-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:border-[#F08C17]/30">
              <button
                onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                className="w-full px-8 py-6 text-left flex items-center justify-between group"
              >
                <h3 className={`text-xl font-semibold transition-colors duration-300 ${openFaq === index ? 'text-[#F08C17]' : 'text-gray-200 group-hover:text-white'}`}>
                  {faq.question}
                </h3>
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${openFaq === index ? 'bg-[#F08C17] text-black' : 'bg-gray-700 text-gray-400 group-hover:bg-gray-600'}`}>
                    <div className="relative w-4 h-4">
                      <div className={`absolute inset-0 transition-all duration-300 ${openFaq === index ? 'opacity-0 rotate-90' : 'opacity-100'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div className={`absolute inset-0 transition-all duration-300 ${openFaq === index ? 'opacity-100' : 'opacity-0 -rotate-90'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
              <div className={`overflow-hidden transition-all duration-500 ease-out ${openFaq === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-8 pb-6">
                  <div className="h-px bg-gradient-to-r from-transparent via-[#F08C17]/30 to-transparent mb-4"></div>
                  <p className="text-gray-300 leading-relaxed text-lg">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-gray-800 to-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4 text-[#F08C17]">Still have questions?</h2>
            <p className="text-gray-300 mb-6">
              Can't find the answer you're looking for? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="tel:+2349032564740" 
                className="bg-[#F08C17] text-black px-6 py-3 rounded-[5px] font-semibold hover:bg-[#e67e0a] transition-colors duration-300"
              >
                Call Us: +2349032564740
              </a>
              <a 
                href="mailto:enquiries@sjfulfillment.com" 
                className="bg-transparent text-[#F08C17] border-2 border-[#F08C17] px-6 py-3 rounded-[5px] font-semibold hover:bg-[#F08C17] hover:text-black transition-colors duration-300"
              >
                Email Us
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

