import { NextResponse } from 'next/server'

const COINGECKO_URL = 'https://api.coingecko.com/api/v3'
const requestHeaders = {
  accept: 'application/json',
  'user-agent': 'NUSA-Crypto-Intelligence/1.0',
}

async function getJson(path) {
  const response = await fetch(COINGECKO_URL + path, {
    headers: requestHeaders,
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    throw new Error('CoinGecko returned ' + response.status)
  }

  return response.json()
}

function cleanExchangeName(name) {
  return name
    .replace(/\b(exchange|pro|spot)\b/gi, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export async function GET() {
  try {
    const [markets, bitcoinTickers] = await Promise.all([
      getJson('/coins/markets?vs_currency=idr&ids=bitcoin,ethereum,solana&order=market_cap_desc&sparkline=true&price_change_percentage=24h'),
      getJson('/coins/bitcoin/tickers?include_exchange_logo=false&depth=true&page=1'),
    ])

    const assets = markets.map((asset) => ({
      id: asset.id,
      symbol: asset.symbol.toUpperCase(),
      name: asset.name,
      image: asset.image,
      price: asset.current_price,
      change24h: asset.price_change_percentage_24h,
      marketCap: asset.market_cap,
      volume24h: asset.total_volume,
      sparkline: asset.sparkline_in_7d?.price?.slice(-24) || [],
    }))

    const seenExchanges = new Set()
    const quotes = (bitcoinTickers.tickers || [])
      .filter((ticker) => ticker.target?.toUpperCase() === 'IDR' && Number.isFinite(Number(ticker.last)))
      .sort((a, b) => Number(b.converted_volume?.usd || 0) - Number(a converted_volume?.usd || 0))
      .map((ticker) => ({
        exchange: cleanExchangeName(ticker.market?.name || ticker.market?.identifier || 'Unknown'),
        price: Number(ticker.last),
        volume24h: Number(ticker.converted_volume?.idr || ticker.volume || 0),
        url: ticker.trade_url || null,
      }))
      .filter((quote) => {
        const key = quote.exchange.toLowerCase()
        if (!quote.exchange || seenExchanges.has(key)) return false
        seenExchanges.add(key)
        return true
      })
      .slice(0, 8)

    const btc = assets.find((asset) => asset.id === 'bitcoin')
    const prices = quotes.map((quote) => quote.price)
    const lowest = prices.length ? Math.min(...prices) : null
    const highest = prices.length ? Math.max(...prices) : null
    const spreadPercent = lowest && highest ? ((highest - lowest) / lowest) * 100 : null

    return NextResponse.json({
      status: 'live',
      fetchedAt: new Date().toISOString(),
      source: {
        name: 'CoinGecko',
        url: 'https://www.coingecko.com/en/api',
        note: 'Data pasar publik; bukan rekomendasi investasi.',
      },
      assets,
      quotes,
      metrics: {
        btcPrice: btc?.price || null,
        btcChange24h: btc?.change24h || null,
        totalVolume24h: assets.reduce((sum, asset) => sum + (asset.volume24h || 0), 0),
        totalMarketCap: assets.reduce((sum, asset) => sum + (asset.marketCap || 0), 0),
        lowest,
        highest,
        spreadPercent,
      },
    })
  } catch (error) {
    return NextResponse.json({
      status: 'degraded',
      fetchedAt: new Date().toISOString(),
      source: { name: 'CoinGecko', url: 'https://www.coingecko.com/en/api' },
      error: 'Sumber data pasar sedang tidak tersedia. Coba refresh beberapa saat lagi.',
    }, { status: 502 })
  }
}
