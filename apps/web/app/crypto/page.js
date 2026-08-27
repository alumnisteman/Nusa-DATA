'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from './crypto.module.css'

const IDR = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const COMPACT_IDR = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 })

const roadmap = [
  { phase: '01', label: 'Market Intelligence', detail: 'Arbitrage + market dashboard', revenue: 'Gratis / validasi user', active: true },
  { phase: '02', label: 'Intelligence', detail: 'Whale Radar + Panic Index', revenue: 'Pro Rp99K/bulan' },
  { phase: '03', label: 'Financial', detail: 'Tax Simulator + reporting', revenue: 'Tax Pro Rp249K/bulan' },
  { phase: '04', label: 'Enterprise', detail: 'Sharia data + API licensing', revenue: 'Kontrak B2B' },
]

function formatMoney(value) {
  return value == null ? '—' : IDR.format(value)
}

function formatCompact(value) {
  return value == null ? '—' : 'Rp ' + COMPACT_IDR.format(value)
}

function formatTime(value) {
  if (!value) return 'Menunggu data'
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value))
}

function Sparkline({ values = [], positive = true }) {
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  return (
    <div className={styles.sparkline} aria-hidden="true">
      {values.slice(-18).map((value, index) => (
        <span key={index} className={positive ? styles.sparkPositive : styles.sparkNegative} style={{ height: (18 + ((value - min) / range) * 42) + '%' }} />
      ))}
    </div>
  )
}

function Signal({ spread }) {
  if (spread == null) return <span className={styles.signalMuted}>NO SIGNAL</span>
  if (spread >= 0.3) return <span className={styles.signalBuy}>BUY / SELL</span>
  return <span className={styles.signalHold}>HOLD</span>
}

export default function CryptoIntelligence() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)

  const loadMarket = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/crypto/market', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Data gagal dimuat')
      setData(payload)
      setLastRefresh(new Date().toISOString())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMarket() }, [loadMarket])

  const quotes = data?.quotes || []
  const low = data?.metrics?.lowest
  const high = data?.metrics?.highest
  const spread = data?.metrics?.spreadPercent
  const feed = useMemo(() => {
    const items = [
      { type: 'LIVE', title: 'Market snapshot diperbarui', detail: 'BTC, ETH, dan SOL dipantau dalam IDR.' },
      { type: 'DATA', title: 'Sumber harga transparan', detail: 'Quote berasal dari ticker publik CoinGecko.' },
    ]
    if (spread != null) items.unshift({ type: spread >= 0.3 ? 'OPPORTUNITY' : 'WATCH', title: 'BTC/IDR spread ' + spread.toFixed(2) + '%', detail: spread >= 0.3 ? 'Selisih lintas-market melewati ambang pemantauan.' : 'Belum melewati ambang pemantauan Phase 1.' })
    return items
  }, [spread])

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <a href="/" className={styles.brand}>
          <span className={styles.brandMark}>N</span>
          <span><strong>NUSA</strong><small>CRYPTO INTELLIGENCE</small></span>
        </a>
        <div className={styles.phaseLabel}>PHASE 01 <span>LIVE MVP</span></div>
        <nav className={styles.nav} aria-label="Crypto navigation">
          <a className={styles.navActive} href="/crypto"><span>◈</span> Overview</a>
          <a href="#arbitrage"><span>⌁</span> Arbitrage scanner</a>
          <a href="#intelligence"><span>◌</span> Intelligence feed</a>
          <a href="#roadmap"><span>↗</span> Roadmap & revenue</a>
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.trustCard}><span className={styles.trustDot} /> Data pipeline online <small>Read-only intelligence</small></div>
          <a href="/" className={styles.backLink}>← Kembali ke NUSA-DATA</a>
        </div>
      </aside>

      <section className={styles.content}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}><span>NUSA-DATA</span><b>/</b> Crypto Intelligence</div>
          <div className={styles.topActions}>
            <span className={styles.liveStatus}><i /> {data?.status === 'live' ? 'Live market data' : 'Connecting to data'}</span>
            <button className={styles.refreshButton} onClick={loadMarket} disabled={loading}>{loading ? 'Memuat…' : '↻ Refresh'}</button>
          </div>
        </header>

        <div className={styles.pageIntro}>
          <div>
            <div className={styles.eyebrow}><span>01</span> MARKET INTELLIGENCE <b>•</b> READ-ONLY</div>
            <h1>See the market.<br /><em>Understand the signal.</em></h1>
            <p>Data crypto Indonesia yang jernih untuk membantu Anda melihat peluang—tanpa eksekusi transaksi dan tanpa janji profit.</p>
          </div>
          <div className={styles.introMeta}><div className={styles.metaLabel}>LAST SYNC</div><strong>{formatTime(lastRefresh)}</strong><small>Timezone: Asia/Jakarta</small></div>
        </div>

        {error && <div className={styles.errorBanner}><span>!</span><div><strong>Data belum tersedia</strong><p>{error}</p></div><button onClick={loadMarket}>Coba lagi</button></div>}

        <section className={styles.statsGrid} aria-label="Market summary">
          <article className={styles.statCard}><div className={styles.statTop}><span>BTC / IDR</span><span className={styles.statIcon}>₿</span></div><strong>{formatMoney(data?.metrics?.btcPrice)}</strong><small className={(data?.metrics?.btcChange24h || 0) >= 0 ? styles.positive : styles.negative}>{data?.metrics?.btcChange24h == null ? '—' : (data.metrics.btcChange24h >= 0 ? '+' : '') + data.metrics.btcChange24h.toFixed(2) + '%'} <span>24H</span></small></article>
          <article className={styles.statCard}><div className={styles.statTop}><span>MARKET VOLUME</span><span className={styles.statIcon}>◒</span></div><strong>{formatCompact(data?.metrics?.totalVolume24h)}</strong><small>3 assets tracked <span className={styles.neutral}>●</span></small></article>
          <article className={styles.statCard}><div className={styles.statTop}><span>MARKET CAP</span><span className={styles.statIcon}>◈</span></div><strong>{formatCompact(data?.metrics?.totalMarketCap)}</strong><small>BTC · ETH · SOL <span className={styles.neutral}>IDR</span></small></article>
          <article className={styles.statCard + ' ' + styles.opportunityCard}><div className={styles.statTop}><span>BEST OBSERVED SPREAD</span><span className={styles.statIcon}>↗</span></div><strong>{spread == null ? '—' : spread.toFixed(2) + '%'}</strong><small>{low && high ? formatMoney(low) + ' → ' + formatMoney(high) : 'Waiting for exchange quotes'}</small></article>
        </section>

        <div className={styles.mainGrid}>
          <section className={styles.panel + ' ' + styles.marketPanel}>
            <div className={styles.panelHeader}><div><span className={styles.panelKicker}>MARKET PULSE</span><h2>Asset overview</h2></div><span className={styles.sourceBadge}>● COINGECKO</span></div>
            <div className={styles.assetList}>
              {(data?.assets || []).map((asset) => (
                <div className={styles.assetRow} key={asset.id}>
                  <div className={styles.assetIdentity}><img src={asset.image} alt="" /><div><strong>{asset.symbol}</strong><small>{asset.name}</small></div></div>
                  <div className={styles.assetChart}><Sparkline values={asset.sparkline} positive={asset.change24h >= 0} /></div>
                  <div className={styles.assetValue}><strong>{formatMoney(asset.price)}</strong><span className={asset.change24h >= 0 ? styles.positive : styles.negative}>{asset.change24h == null ? '—' : (asset.change24h >= 0 ? '+' : '') + asset.change24h.toFixed(2) + '%'}</span></div>
                </div>
              ))}
              {!data?.assets?.length && !loading && <div className={styles.emptyState}>Market cards akan muncul saat sumber data tersambung.</div>}
              {loading && <div className={styles.loadingState}>Mengambil market snapshot…</div>}
            </div>
          </section>

          <section className={styles.panel + ' ' + styles.feedPanel} id="intelligence">
            <div className={styles.panelHeader}><div><span className={styles.panelKicker}>SIGNAL STREAM</span><h2>Intelligence feed</h2></div><span className={styles.pulse}>●</span></div>
            <div className={styles.feedList}>{feed.map((item, index) => <div className={styles.feedItem} key={item.title}><span className={index === 0 ? styles.feedMarkerBright : styles.feedMarker}>{item.type}</span><div><strong>{item.title}</strong><p>{item.detail}</p><small>{index === 0 ? formatTime(lastRefresh) : 'Phase 1 protocol'}</small></div></div>)}</div>
            <div className={styles.feedFooter}>Signals are descriptive, not financial advice <span>↗</span></div>
          </section>
        </div>

        <section className={styles.panel + ' ' + styles.arbitragePanel} id="arbitrage">
          <div className={styles.panelHeader}><div><span className={styles.panelKicker}>CROSS-MARKET MONITOR</span><h2>BTC / IDR arbitrage scanner</h2><p className={styles.panelDescription}>Perbandingan harga publik lintas exchange. NUSA tidak mengeksekusi order.</p></div><div className={styles.threshold}><span>WATCH THRESHOLD</span><strong>0.30%</strong></div></div>
          <div className={styles.quoteHeader}><span>EXCHANGE</span><span>LAST PRICE</span><span>24H VOLUME</span><span>SIGNAL</span></div>
          <div className={styles.quoteList}>{quotes.map((quote, index) => { const localSpread = low ? ((quote.price - low) / low) * 100 : null; return <div className={styles.quoteRow} key={quote.exchange}><div className={styles.exchangeName}><span className={styles.exchangeRank}>0{index + 1}</span><strong>{quote.exchange}</strong></div><strong>{formatMoney(quote.price)}</strong><span>{formatCompact(quote.volume24h)}</span><Signal spread={localSpread} /></div> })}{!quotes.length && <div className={styles.emptyState}>{loading ? 'Mengambil ticker BTC/IDR…' : 'Belum ada ticker IDR yang tersedia dari sumber publik.'}</div>}</div>
          <div className={styles.scannerNote}><span>ⓘ</span> Spread adalah selisih harga observasi, belum dikurangi fee, slippage, transfer time, atau pajak. Gunakan untuk riset saja.</div>
        </section>

        <section className={styles.roadmapSection} id="roadmap">
          <div className={styles.roadmapIntro}><span className={styles.panelKicker}>FROM DATA TO BUSINESS</span><h2>Roadmap yang menghasilkan trust<br /><em>sebelum revenue.</em></h2><p>Mulai dari data yang berguna dan gratis. Monetisasi mengikuti bukti penggunaan—bukan mendahului kepercayaan.</p></div>
          <div className={styles.roadmapList}>{roadmap.map((item) => <div className={item.active ? styles.roadmapItemActive : styles.roadmapItem} key={item.phase}><div className={styles.roadmapNumber}>{item.phase}</div><div><strong>{item.label}</strong><span>{item.detail}</span><small>{item.revenue}</small></div>{item.active && <b className={styles.nowBadge}>NOW</b>}</div>)}</div>
          <div className={styles.revenueCard}><div className={styles.panelKicker}>MODEL PENDAPATAN</div><h3>Start free. Scale with intelligence.</h3><div className={styles.revenueBars}><div><span style={{ height: '12%' }} /><small>PHASE 1<strong>Rp 0</strong></small></div><div><span style={{ height: '42%' }} /><small>PHASE 2<strong>Rp114 jt</strong></small></div><div><span style={{ height: '78%' }} /><small>PHASE 3<strong>Rp656 jt</strong></small></div><div><span style={{ height: '100%' }} /><small>PHASE 6<strong>Rp1,87 M</strong></small></div></div><p>Ilustrasi target bulanan, bukan proyeksi atau jaminan.</p></div>
        </section>

        <footer className={styles.footer}><span>NUSA Crypto Intelligence · Phase 01</span><span>Public market data · Informational only</span></footer>
      </section>
    </main>
  )
}
