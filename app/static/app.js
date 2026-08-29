document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    const body = document.body;

    themeToggle.addEventListener('click', () => {
        body.classList.toggle('light-theme');
        body.classList.toggle('dark-theme');
        
        if (body.classList.contains('light-theme')) {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    });

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
            
            if (btn.id === 'load-dashboard') {
                loadDashboard();
            }
        });
    });

    // Form Submission
    const form = document.getElementById('analysis-form');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('span');
    const spinner = submitBtn.querySelector('.spinner');
    const resultsContainer = document.getElementById('results-container');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Loading state
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        spinner.style.display = 'block';
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Convert numbers and clean empty
        for(const k of ['latitude','longitude','investment_amount']) {
            if(data[k] === '') delete data[k]; 
            else if(data[k]) data[k] = Number(data[k]);
        }

        try {
            const response = await fetch('/api/v1/analyses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.detail || 'Terjadi kesalahan');
            }
            
            renderResult(result, resultsContainer);
            
            // Scroll to results on mobile
            if (window.innerWidth <= 900) {
                resultsContainer.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            resultsContainer.innerHTML = `
                <div class="glass-panel" style="border-color: var(--danger)">
                    <h3 style="color: var(--danger)">❌ Error</h3>
                    <p>${error.message}</p>
                </div>
            `;
        } finally {
            submitBtn.disabled = false;
            btnText.style.display = 'block';
            spinner.style.display = 'none';
        }
    });

    function renderResult(data, container) {
        let statusColor = data.status === 'READY_FOR_REVIEW' ? 'var(--success)' : 
                          data.status === 'NEEDS_REVIEW' ? 'var(--warning)' : 'var(--danger)';
                          
        container.innerHTML = `
            <div class="glass-panel animation-fade">
                <div class="score-card" style="margin-bottom: 2rem;">
                    <div class="text-muted" style="margin-bottom: 1rem">BUSINESS DNA SCORE</div>
                    
                    <div class="radial-gauge">
                        <svg>
                            <circle class="gauge-bg" cx="75" cy="75" r="70"></circle>
                            <circle class="gauge-progress" cx="75" cy="75" r="70" 
                                    style="stroke: ${statusColor}; stroke-dashoffset: ${440 - (440 * (data.business_dna_score || 0)) / 100}"></circle>
                        </svg>
                        <div class="gauge-text" style="color: ${statusColor}">${data.business_dna_score || 0}</div>
                    </div>
                    
                    <h3 class="status-${data.status.toLowerCase().replace(/_/g, '-')}${data.status === 'READY_FOR_REVIEW' ? ' pulse' : ''}" style="color: ${statusColor}; margin: 0">${data.status.replace(/_/g, ' ')}</h3>
                </div>

                <h3>🧬 Business DNA</h3>
                <div class="dna-grid" style="display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 2rem;">
                    <div class="dna-item" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
                        <strong>Aktivitas Utama:</strong> ${data.business_dna?.aktivitas_utama?.join(", ") || '-'}
                    </div>
                    <div class="dna-item" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
                        <strong>Aktivitas Pendukung:</strong> ${data.business_dna?.aktivitas_pendukung?.join(", ") || '-'}
                    </div>
                    <div class="dna-item" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
                        <strong>Produk:</strong> ${data.business_dna?.produk?.join(", ") || '-'}
                    </div>
                    <div class="dna-item" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
                        <strong>Jasa:</strong> ${data.business_dna?.jasa?.join(", ") || '-'}
                    </div>
                    <div class="dna-item" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
                        <strong>Target Pasar:</strong> ${data.business_dna?.target_pasar || '-'}
                    </div>
                    <div class="dna-item" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
                        <strong>Model Transaksi:</strong> ${data.business_dna?.model_transaksi || '-'}
                    </div>
                    <div class="dna-item" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
                        <strong>Potensi Pengadaan:</strong> ${data.business_dna?.potensi_pengadaan?.join(", ") || '-'}
                    </div>
                </div>

                <h3>⚖️ What Can I Legally Do?</h3>
                <div class="legal-grid" style="margin-bottom: 2rem;">
                    <div style="border-left: 4px solid var(--success); padding-left: 1rem; margin-bottom: 1rem;">
                        <h4 style="color: var(--success); margin: 0 0 0.5rem 0;">🟢 Anda Bisa:</h4>
                        <ul style="margin: 0; padding-left: 1.2rem;">
                            ${(data.what_can_i_legally_do?.anda_bisa || []).map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                    <div style="border-left: 4px solid var(--warning); padding-left: 1rem; margin-bottom: 1rem;">
                        <h4 style="color: var(--warning); margin: 0 0 0.5rem 0;">🟡 Anda Perlu Memenuhi:</h4>
                        <ul style="margin: 0; padding-left: 1.2rem;">
                            ${(data.what_can_i_legally_do?.anda_perlu_memenuhi || []).map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                    <div style="border-left: 4px solid var(--danger); padding-left: 1rem; margin-bottom: 1rem;">
                        <h4 style="color: var(--danger); margin: 0 0 0.5rem 0;">🔴 Jangan Lakukan:</h4>
                        <ul style="margin: 0; padding-left: 1.2rem;">
                            ${(data.what_can_i_legally_do?.jangan_lakukan || []).map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                </div>

                <h3>🎯 Kandidat KBLI</h3>
                ${data.kbli_matches.map(x => `
                    <div class="kbli-item">
                        <div style="display: flex; justify-content: space-between; align-items: start">
                            <span class="kbli-code">${x.code}</span>
                            <span class="text-xs" style="color: var(--accent-solid)">Match: ${x.score}%</span>
                        </div>
                        <div style="font-weight: 600; margin: 0.5rem 0">${x.title}</div>
                        <div class="text-xs text-muted">${x.reason}</div>
                    </div>
                `).join('')}

                <p class="text-xs text-muted" style="margin-top: 2rem; font-style: italic;">
                    ${data.disclaimer}
                </p>
            </div>
        `;
        
        // Trigger reflow for gauge animation
        setTimeout(() => {
            const gauge = container.querySelector('.gauge-progress');
            if(gauge) gauge.style.strokeDashoffset = 440 - (440 * data.readiness_score) / 100;
        }, 50);
    }

    async function loadDashboard() {
        const statsContainer = document.getElementById('stats-container');
        const historyContainer = document.getElementById('history-container');
        
        statsContainer.innerHTML = '<div class="spinner" style="border-top-color: var(--accent-solid)"></div>';
        historyContainer.innerHTML = '<div class="spinner" style="border-top-color: var(--accent-solid)"></div>';
        
        try {
            // Load stats
            const statsRes = await fetch('/api/v1/stats');
            const stats = await statsRes.json();
            
            statsContainer.innerHTML = `
                <div class="stat-card glass-panel">
                    <div class="text-muted">Total Analisis</div>
                    <div class="stat-value">${stats.total_analyses}</div>
                </div>
                <div class="stat-card glass-panel">
                    <div class="text-muted">Rata-rata Score</div>
                    <div class="stat-value">${stats.avg_score}</div>
                </div>
            `;
            
            // Load history
            const histRes = await fetch('/api/v1/analyses');
            const history = await histRes.json();
            
            if (history.items.length === 0) {
                historyContainer.innerHTML = '<p class="text-muted">Belum ada riwayat analisis.</p>';
            } else {
                historyContainer.innerHTML = history.items.map(item => {
                    const date = new Date(item.created_at).toLocaleString('id-ID');
                    let color = item.readiness_score >= 90 ? 'var(--success)' : 
                                item.readiness_score >= 75 ? 'var(--warning)' : 'var(--danger)';
                    return `
                        <div class="history-item" onclick="openHistoryDetail('${item.id}')">
                            <div class="history-score" style="color: ${color}; border: 2px solid ${color}">${item.readiness_score}</div>
                            <div>
                                <div style="font-weight: 600">${item.business_name}</div>
                                <div class="text-xs text-muted">${date}</div>
                            </div>
                            <div class="text-muted">➔</div>
                        </div>
                    `;
                }).join('');
            }
        } catch (error) {
            console.error("Failed to load dashboard", error);
            statsContainer.innerHTML = '<p>Gagal memuat statistik</p>';
            historyContainer.innerHTML = '<p>Gagal memuat riwayat</p>';
        }
    }

    // Modal logic
    const modal = document.getElementById('history-modal');
    const closeBtn = document.querySelector('.close-modal');
    
    closeBtn.onclick = () => modal.classList.remove('show');
    window.onclick = (e) => { if (e.target == modal) modal.classList.remove('show'); }

    window.openHistoryDetail = async (id) => {
        const body = document.getElementById('modal-body');
        body.innerHTML = '<div class="spinner" style="margin: 2rem auto; border-top-color: var(--accent-solid)"></div>';
        modal.classList.add('show');
        
        try {
            const res = await fetch(`/api/v1/analyses/${id}`);
            const data = await res.json();
            renderResult(data, body);
        } catch (error) {
            console.error(error);
            body.innerHTML = '<p>Error memuat detail</p>';
        }
    };

    // Passport Form Logic
    const passportForm = document.getElementById('passport-form');
    const passportSubmitBtn = document.getElementById('passport-submit-btn');
    const passportResultsContainer = document.getElementById('passport-results-container');

    if (passportForm) {
        passportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const companyId = document.getElementById('company_id').value;
            
            passportSubmitBtn.disabled = true;
            passportSubmitBtn.querySelector('span').style.display = 'none';
            passportSubmitBtn.querySelector('.spinner').style.display = 'block';

            try {
                const response = await fetch(`/api/v1/companies/${companyId}/gap-scan`);
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.detail || 'Terjadi kesalahan');
                }
                
                renderPassport(result, passportResultsContainer);
            } catch (error) {
                passportResultsContainer.innerHTML = `
                    <div class="glass-panel" style="border-color: var(--danger)">
                        <h3 style="color: var(--danger)">❌ Error</h3>
                        <p>${error.message}</p>
                    </div>
                `;
            } finally {
                passportSubmitBtn.disabled = false;
                passportSubmitBtn.querySelector('span').style.display = 'block';
                passportSubmitBtn.querySelector('.spinner').style.display = 'none';
            }
        });
    }

    function renderPassport(data, container) {
        const company = data.company;
        const scan = data.scan_result;
        
        let statusColor = scan.status === 'PROCUREMENT_READY' ? 'var(--success)' : 
                          scan.status === 'NEEDS_IMPROVEMENT' ? 'var(--warning)' : 'var(--danger)';

        container.innerHTML = `
            <div class="glass-panel animation-fade">
                <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 1px solid var(--glass-border); padding-bottom: 1rem; margin-bottom: 1rem;">
                    <div>
                        <h2 style="margin: 0; color: var(--accent-solid)">${company.name}</h2>
                        <p class="text-muted" style="margin: 0;">NIB: ${company.nib || '-'}</p>
                    </div>
                    <div style="text-align: right;">
                        <h3 style="margin: 0; color: ${statusColor}">${scan.score} / ${scan.max_score}</h3>
                        <span class="status-badge" style="background: ${statusColor}; color: #000; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">
                            ${scan.status.replace(/_/g, ' ')}
                        </span>
                    </div>
                </div>

                <h3>📋 Hasil Analisis Gap Scanner</h3>
                <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 2rem;">
                    ${scan.findings.map(f => `
                        <div style="padding: 1rem; border-left: 4px solid ${f.type === 'DANGER' ? 'var(--danger)' : f.type === 'WARNING' ? 'var(--warning)' : 'var(--success)'}; background: rgba(255,255,255,0.05); border-radius: 0 8px 8px 0;">
                            ${f.message}
                        </div>
                    `).join('')}
                </div>

                <div class="grid-layout" style="gap: 1rem;">
                    <div>
                        <h3>🏢 Data KBLI</h3>
                        <ul style="padding-left: 1rem; color: var(--text-secondary)">
                            ${company.kblis.map(k => `<li>${k.kbli_code} ${k.is_main ? '<strong>(Utama)</strong>' : ''}</li>`).join('')}
                        </ul>
                    </div>
                    <div>
                        <h3>📄 Dokumen Legalitas</h3>
                        <ul style="padding-left: 1rem; color: var(--text-secondary)">
                            ${company.documents.map(d => `<li>${d.document_type} ${d.document_number ? '('+d.document_number+')' : ''}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
});
