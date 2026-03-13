import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { EXECUTORS, SELLERS, type Executor, type ExecutorPlan, type Seller } from './types'

const ExecutorTab: React.FC = () => {
  const [selectedSeller, setSelectedSeller] = useState<Seller>(SELLERS[0])
  const [showSellerDropdown, setShowSellerDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSellerDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePurchase = (_plan: ExecutorPlan, _executor: Executor) => {
    // Open the selected seller's website
    window.open(`${selectedSeller.url}`, '_blank')
  }

  // Calculate discounted price based on seller
  const getDiscountedPrice = (originalPrice: number): number => {
    if (!selectedSeller.discount) return originalPrice
    
    const discountMatch = selectedSeller.discount.match(/(\d+)%/)
    if (!discountMatch) return originalPrice
    
    const discountPercent = parseInt(discountMatch[1], 10)
    return originalPrice * (1 - discountPercent / 100)
  }

  // Filter and sort executors by cheapest price first (best value) for selected seller
  const sortedExecutors = [...EXECUTORS]
    .filter(executor => selectedSeller.executors.includes(executor.id))
    .sort((a, b) => {
      const cheapestA = Math.min(...a.plans.map(plan => getDiscountedPrice(plan.price)))
      const cheapestB = Math.min(...b.plans.map(plan => getDiscountedPrice(plan.price)))
      return cheapestA - cheapestB
    })

  return (
    <div className="absolute inset-0 flex flex-col w-full h-full bg-neutral-950 overflow-y-auto font-sans scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
      <div className="flex-1 p-3">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h1 className="text-lg font-bold text-white">Roblox Executors</h1>
              <p className="text-neutral-400 text-xs">Premium selection with best deals</p>
            </div>
            {/* Seller Selection - Moved to Header */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowSellerDropdown(!showSellerDropdown)}
                className="bg-neutral-800 border border-neutral-700 rounded-md px-2.5 py-1.5 text-left flex items-center justify-between hover:border-neutral-600 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-medium">{selectedSeller.name}</span>
                  {selectedSeller.discount && (
                    <span className="text-xs text-green-400 font-semibold">{selectedSeller.discount}</span>
                  )}
                </div>
                <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ml-1 ${showSellerDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showSellerDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-md shadow-lg z-10 min-w-[200px]">
                  {SELLERS.map((seller) => (
                    <button
                      key={seller.id}
                      onClick={() => {
                        setSelectedSeller(seller)
                        setShowSellerDropdown(false)
                      }}
                      className="w-full px-2.5 py-1.5 text-left hover:bg-neutral-700 transition-colors flex items-center gap-2 first:rounded-t-md last:rounded-b-md text-xs"
                    >
                      <ExternalLink className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                        <span className="text-white text-xs font-medium">{seller.name}</span>
                        {seller.discount && (
                          <span className="text-xs text-green-400">{seller.discount}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Executor Grid - Compact Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {sortedExecutors.map((executor) => (
              <motion.div
                key={executor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-neutral-900/60 rounded-md border border-neutral-800/80 overflow-hidden hover:border-neutral-700/80 hover:bg-neutral-900 transition-all"
              >
                <div className="p-2.5">
                  <div className="flex items-center justify-center mb-2">
                    <img
                      src={executor.icon}
                      alt={executor.name}
                      className="w-10 h-10 object-contain"
                    />
                  </div>

                  <h3 className="text-xs font-semibold text-white text-center mb-2 truncate">
                    {executor.name}
                  </h3>

                  <div className="space-y-1">
                    {executor.plans.map((plan) => (
                      <div
                        key={plan.id}
                        className="flex items-center justify-between gap-1 p-1.5 bg-neutral-800/50 rounded-sm hover:bg-neutral-750/60 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-white truncate">
                            {plan.name}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 ml-1 flex-shrink-0">
                          {selectedSeller.discount ? (
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-neutral-500 line-through leading-none">
                                ${plan.price.toFixed(2)}
                              </span>
                              <span className="text-xs font-semibold text-green-400 leading-none">
                                ${getDiscountedPrice(plan.price).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-green-400">
                              ${plan.price.toFixed(2)}
                            </span>
                          )}
                          <button
                            onClick={() => handlePurchase(plan, executor)}
                            className="px-1.5 py-0.5 text-white text-xs rounded-sm transition-colors flex items-center gap-0.5 flex-shrink-0"
                            style={{
                              backgroundColor: 'var(--accent-color)',
                              color: 'var(--accent-color-foreground)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--accent-color-muted)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--accent-color)'
                            }}
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExecutorTab