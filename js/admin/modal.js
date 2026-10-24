// Nahrazuje nativni alert()/confirm()/prompt() vlastnim dialogem v tematu
// aplikace. Vsechny metody vraci Promise, stejne jako by to delaly async
// wrappery kolem window.* dialogu.
const AdminModal = {
  _resolve: null,
  _isPrompt: false,

  _els() {
    return {
      overlay: document.getElementById('modalOverlay'),
      title: document.getElementById('modalTitle'),
      body: document.getElementById('modalBody'),
      inputWrap: document.getElementById('modalInputWrap'),
      input: document.getElementById('modalInput'),
      cancelBtn: document.getElementById('modalCancelBtn'),
      confirmBtn: document.getElementById('modalConfirmBtn'),
    };
  },

  _open({ title, body, showInput, inputValue, inputPlaceholder, confirmLabel, cancelLabel, danger, showCancel = true }) {
    const el = this._els();
    el.title.textContent = title || '';
    el.body.textContent = body || '';
    el.inputWrap.style.display = showInput ? 'block' : 'none';
    el.input.value = inputValue || '';
    el.input.placeholder = inputPlaceholder || '';
    el.confirmBtn.textContent = confirmLabel || 'OK';
    el.confirmBtn.className = 'btn ' + (danger ? 'btn-accent' : 'btn-primary');
    el.cancelBtn.style.display = showCancel ? 'inline-flex' : 'none';
    el.cancelBtn.textContent = cancelLabel || 'Zrušit';
    el.overlay.style.display = 'flex';
    if (showInput) setTimeout(() => el.input.focus(), 20);
    else setTimeout(() => el.confirmBtn.focus(), 20);
  },

  _close() {
    this._els().overlay.style.display = 'none';
  },

  confirm(opts) {
    this._isPrompt = false;
    return new Promise((resolve) => {
      this._resolve = resolve;
      this._open({ ...opts, showInput: false });
    });
  },

  prompt(opts) {
    this._isPrompt = true;
    return new Promise((resolve) => {
      this._resolve = resolve;
      this._open({ ...opts, showInput: true, inputValue: opts.defaultValue });
    });
  },

  alert(opts) {
    this._isPrompt = false;
    return new Promise((resolve) => {
      this._resolve = resolve;
      this._open({ ...opts, showInput: false, showCancel: false, confirmLabel: opts.confirmLabel || 'Rozumím' });
    });
  },

  _onConfirm() {
    const value = this._isPrompt ? this._els().input.value : true;
    this._close();
    if (this._resolve) this._resolve(value);
    this._resolve = null;
  },

  _onCancel() {
    this._close();
    if (this._resolve) this._resolve(this._isPrompt ? null : false);
    this._resolve = null;
  },

  init() {
    const el = this._els();
    el.confirmBtn.addEventListener('click', () => this._onConfirm());
    el.cancelBtn.addEventListener('click', () => this._onCancel());
    el.overlay.addEventListener('click', (ev) => {
      if (ev.target === el.overlay) this._onCancel();
    });
    el.input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') this._onConfirm();
      if (ev.key === 'Escape') this._onCancel();
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && el.overlay.style.display === 'flex') this._onCancel();
    });
  },
};

document.addEventListener('DOMContentLoaded', () => AdminModal.init());
