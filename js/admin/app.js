const AdminApp = {
  initialized: false,

  async init() {
    document.getElementById('adminLoading').style.display = 'block';
    try {
      await AdminData.load();
      AdminManage.populateCompetitionSelects();
      AdminManage.populateDisciplinySelect();
      AdminManage.initAll();
      AdminSettings.init();
      AdminPublish.refreshSummary();
      this.wireTabs();
      this.initialized = true;
    } catch (err) {
      document.getElementById('adminLoading').textContent = '❌ Nepodařilo se načíst data: ' + err.message;
      return;
    }
    document.getElementById('adminLoading').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
  },

  wireTabs() {
    document.querySelectorAll('.js-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.showTab(btn.dataset.tab));
    });
  },

  showTab(name) {
    document.querySelectorAll('.js-tab-panel').forEach((el) => {
      el.classList.toggle('active', el.dataset.tabPanel === name);
    });
    document.querySelectorAll('.js-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === name);
    });
  },
};

document.addEventListener('DOMContentLoaded', () => {
  AdminAuth.checkStatus();
});
