(() => {
    const labels = {
        NO_SAVED_PICKUP_PLAN: 'Išsaugoto perdavimo plano nėra.',
        UNEXPECTED_MOVEMENT: 'Rastas nenumatytas prekės judėjimas. Reikalinga patikra.',
        PICKUP_EVIDENCE_CONFLICT: 'Perdavimo duomenys nesutampa. Reikalinga patikra.',
        NO_PICKUP_EFFECT_OBSERVED: 'Perdavimo pakeitimų nepastebėta.',
        COMPLETED_EFFECTS_OBSERVED: 'Užbaigto perdavimo pakeitimai patvirtinti.',
        EFFECTS_APPLIED_REVIEW_FINALIZATION: 'Pakeitimai atlikti; užbaigimą reikia patikrinti.',
        LEDGER_APPLIED_PROJECTIONS_PENDING: 'Judėjimas įrašytas; ne visi susiję įrašai atnaujinti.',
        LOCK_REVIEW_REQUIRED: 'Reikalinga operacijos užraktų patikra.',
        STATE_CHANGED_DURING_REVIEW: 'Tikrinant būsena pasikeitė. Patikrinkite dar kartą.'
    };
    class PickupReview extends HTMLElement {
        static get observedAttributes() { return ['pickup-state']; }
        connectedCallback() {
            if (!this.shadowRoot) {
                const root = this.attachShadow({ mode: 'open' });
                root.innerHTML = `<style>
                :host{display:block;color:#edf0f3;font:15px/1.6 Arial,sans-serif}
                *{box-sizing:border-box}.panel{padding:24px;border:1px solid #39414c;border-radius:12px;background:#151a20}
                h2{margin:0 0 10px;font-size:24px}p{overflow-wrap:anywhere}
                form{display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin:20px 0}
                label{flex:1;min-width:180px}input{display:block;width:100%;margin-top:6px;padding:12px;background:#20262d;color:inherit;border:1px solid #626b78;border-radius:6px}
                button{padding:12px 16px;border:1px solid #bda36c;border-radius:6px;background:#d0b57c;color:#15171a;font:inherit;cursor:pointer}
                button:disabled{opacity:.5;cursor:default}button:focus-visible,input:focus-visible{outline:2px solid #dcc28c;outline-offset:3px}
                .muted{color:#abb4bf}.actions{display:flex;flex-wrap:wrap;gap:12px}
                [hidden]{display:none!important}
                </style><section class="panel" aria-label="Atsiėmimo peržiūra">
                <h2>Atsiėmimo peržiūra</h2><p class="muted">Patikrinkite perdavimo operacijos būseną.</p>
                <button id="check" type="button">Patikrinti prieigą</button>
                <form><label>Operacijos ID<input id="operation" maxlength="128" autocomplete="off" required pattern="[A-Za-z0-9_-]{1,128}"></label>
                <button id="review" type="submit" disabled>Peržiūrėti</button></form>
                <p id="status" role="status" aria-live="polite"></p><div id="result" hidden></div>
                <p class="muted">Šiame ekrane likučių keitimas išjungtas.</p>
                <div class="actions"><button disabled>Perduoti</button><button disabled>Tęsti operaciją</button><button disabled>Užbaigti</button></div>
                </section>`;
                root.getElementById('check').addEventListener('click', () => this.emit({ action: 'check' }));
                root.querySelector('form').addEventListener('submit', event => {
                    event.preventDefault();
                    if (!root.getElementById('review').disabled) this.emit({ action: 'review',
                        operationId: root.getElementById('operation').value.trim() });
                });
            }
            this.render();
            this.dispatchEvent(new CustomEvent('pickup-ready', { detail: { version: 1 } }));
        }
        emit(detail) { this.dispatchEvent(new CustomEvent('pickup-action', { detail })); }
        attributeChangedCallback() { if (this.isConnected && this.shadowRoot) this.render(); }
        disconnectedCallback() {
            this.removeAttribute('pickup-state');
            if (this.shadowRoot) {
                this.shadowRoot.getElementById('operation').value = '';
                this.render();
            }
        }
        render() {
            const root = this.shadowRoot, result = root.getElementById('result');
            result.replaceChildren(); result.hidden = true;
            let state;
            try {
                const raw = this.getAttribute('pickup-state') || '{}';
                if (raw.length > 200000) throw new Error();
                state = JSON.parse(raw);
            } catch { state = {}; }
            const messages = { IDLE: 'Patikrinkite administratoriaus prieigą.', CHECKING: 'Tikrinama prieiga…',
                READY: 'Prieiga patvirtinta. Įveskite operacijos ID.', LOADING: 'Tikrinama operacija…',
                INVALID_INPUT: 'Patikrinkite operacijos ID.', UNAVAILABLE: 'Peržiūra nepasiekiama. Patikrinkite prisijungimą ir bandykite dar kartą.',
                REVIEWED: 'Operacijos patikra baigta.' };
            const phase = Object.hasOwn(messages, state?.phase) ? state.phase : 'IDLE';
            const busy = ['CHECKING', 'LOADING'].includes(phase);
            root.querySelector('section').setAttribute('aria-busy', String(busy));
            root.getElementById('check').disabled = busy;
            root.getElementById('review').disabled = !['READY', 'REVIEWED', 'INVALID_INPUT'].includes(phase);
            root.getElementById('status').textContent = messages[phase];
            if (['IDLE', 'UNAVAILABLE'].includes(phase)) root.getElementById('operation').value = '';
            if (phase === 'REVIEWED' && Object.hasOwn(labels, state.result?.assessment)
                && state.result?.canAutoResume === false && /^[A-Za-z0-9_-]{1,128}$/.test(state.result?.operationId)) {
                for (const text of [state.result.operationId, labels[state.result.assessment],
                    'Automatinis operacijos tęsinys neleidžiamas.']) {
                    const p = document.createElement('p'); p.textContent = text; result.append(p);
                }
                result.hidden = false;
            }
        }
    }
    if (!customElements.get('auterra-pickup-review')) customElements.define('auterra-pickup-review', PickupReview);
})();
