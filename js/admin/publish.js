const AdminPublish = {
  refreshSummary() {
    const dirty = AdminData.isDirty();
    const { pridano, zmeneno } = AdminData.changeSummary();
    const el = document.getElementById('publishSummary');
    const btn = document.getElementById('publishBtn');
    if (!dirty) {
      el.textContent = 'Žádné neuložené změny.';
      btn.disabled = true;
    } else {
      el.textContent = `Neuložené změny: ${pridano} nových zápasů, ${zmeneno} upravených. Zkontroluj prosím a teprve pak publikuj.`;
      btn.disabled = false;
    }
  },

  async publish() {
    const note = document.getElementById('publishMessage').value.trim();
    const statusEl = document.getElementById('publishStatus');
    document.getElementById('publishBtn').disabled = true;
    statusEl.textContent = 'Publikuji na GitHub…';

    try {
      const result = await AdminApi.publish(AdminData.draft, note);
      statusEl.textContent = `✓ Publikováno (commit ${result.commitSha ? result.commitSha.slice(0, 7) : ''}). Web se aktualizuje během chvíle.`;
      AdminData.raw = JSON.parse(JSON.stringify(AdminData.draft));
      document.getElementById('publishMessage').value = '';
      this.refreshSummary();
    } catch (err) {
      statusEl.textContent = '❌ ' + err.message;
      document.getElementById('publishBtn').disabled = false;
    }
  },
};
