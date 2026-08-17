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
      el.style.display = el.dataset.tabPanel === name ? 'block' : 'none';
    });
    document.querySelectorAll('.js-tab-btn').forEach((btn) => {
      btn.classList.toggle('bg-red-600', btn.dataset.tab === name);
      btn.classList.toggle('text-white', btn.dataset.tab === name);
      btn.classList.toggle('bg-gray-200', btn.dataset.tab !== name);
    });
  },
};

document.addEventListener('DOMContentLoaded', () => {
  AdminAuth.checkStatus();
});
