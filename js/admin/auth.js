const AdminAuth = {
  async checkStatus() {
    const { authenticated } = await AdminApi.status();
    this.showApp(authenticated);
    if (authenticated) await AdminApp.init();
  },

  showApp(authenticated) {
    document.getElementById('loginScreen').style.display = authenticated ? 'none' : 'flex';
    document.getElementById('adminApp').style.display = authenticated ? 'block' : 'none';
  },

  async login(ev) {
    ev.preventDefault();
    const password = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('loginError');
    errEl.textContent = '';
    try {
      await AdminApi.login(password);
      document.getElementById('loginPassword').value = '';
      this.showApp(true);
      await AdminApp.init();
    } catch (err) {
      errEl.textContent = err.message;
    }
  },

  async logout() {
    await AdminApi.logout();
    this.showApp(false);
  },
};
