
function injectLayout(pageType = 'subpage') {
  // Inject Header
  const header = document.querySelector('header');
  if (header) {
    // 首页链接带图标
    const homeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
    
    const headerLeft = `
      <div class="header-left">
        <a class="home-link" href="./index.html">${homeIcon} 首页</a>
        <h1>${document.title.split('-')[0].trim()}</h1>
      </div>
    `;

    let headerContent = headerLeft;
    
    if (pageType === 'home') {
      headerContent += `
        <nav class="tabs-container">
          <button class="tab-btn active" onclick="showTab('agentic')">智能体指数</button>
          <button class="tab-btn" onclick="showTab('finance')">金融指数</button>
          <button class="tab-btn" onclick="showTab('ecommerce')">电商指数</button>
          <button class="tab-btn" onclick="showTab('comparison')">模型对比</button>
          <button class="tab-btn" onclick="showTab('selection')">模型选型</button>
          <button class="tab-btn" onclick="showTab('methods')">测试方法</button>
        </nav>
      `;
    }
    
    header.innerHTML = `
      <div class="header-inner">
        ${headerContent}
      </div>
    `;
  }

  // Inject Footer
  const footer = document.querySelector('footer');
  if (footer) {
    const year = new Date().getFullYear();
    const pageName = document.title.split('-')[0].trim();
    footer.innerHTML = `
      <div class="footer-inner">
        <span>&copy; ${year} qq3dworld.com • ${pageName} Analysis</span>
      </div>
    `;
  }
}
