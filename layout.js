
function injectLayout(pageType = 'subpage') {
  // Inject Header
  const header = document.querySelector('header');
  if (header) {
    const headerLeft = `
      <div class="header-left">
        <a class="home-link" href="./index.html">首页</a>
        <h1>${document.title.split('-')[0].trim()}</h1>
      </div>
    `;

    let headerContent = headerLeft;
    
    if (pageType === 'home') {
      headerContent += `
        <div class="tabs-container">
          <button class="tab-btn active" onclick="showTab('agentic')">智能体指数</button>
          <button class="tab-btn" onclick="showTab('finance')">金融指数（规划中）</button>
          <button class="tab-btn" onclick="showTab('coding')">电商指数（规划中）</button>
          <button class="tab-btn" onclick="showTab('comparison')">模型对比</button>
          <button class="tab-btn" onclick="showTab('selection')">模型选型</button>
        </div>
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
        <span>qq3dworld.com • ${pageName} Analysis</span>
      </div>
    `;
  }
}
