(function () {
  let allStores = [];
  let currentRegion = 'all';
  let currentSearchKeyword = '';

  // 地區映射
  const regionMap = {
    'all': null,
    'tw': '台灣',
    'au': '澳洲',
    'at': '奧地利',
    'be': '比利時',
    'br': '巴西',
    'ca': '加拿大',
    'cn': '中國大陸',
    'fr': '法國',
    'de': '德國',
    'hk': '香港',
    'in': '印度',
    'it': '義大利',
    'jp': '日本',
    'mo': '澳門',
    'my': '馬來西亞',
    'mx': '墨西哥',
    'nl': '荷蘭',
    'sg': '新加坡',
    'kr': '南韓',
    'es': '西班牙',
    'se': '瑞典',
    'ch': '瑞士',
    'th': '泰國',
    'tr': '土耳其',
    'ae': '阿拉伯聯合大公國',
    'us': '美國',
    'gb': '英國'
  };

  // 加载门市数据的函数
  async function loadStoresData() {
    // 显示 loading
    const loadingEl = document.getElementById('storesLoading');
    const listEl = document.getElementById('storesList');
    if (loadingEl) loadingEl.style.display = 'flex';
    if (listEl) listEl.style.display = 'none';
    
    // 每次进入页面都重新加载门市数据
    console.log('加载门市数据...');
    try {
      allStores = await fetchStores();
      if (!allStores || allStores.length === 0) {
        // 如果获取失败，使用缓存数据
        allStores = getStoredStores();
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error);
      // 如果 API 失败，使用缓存数据或示例数据
      allStores = getStoredStores();
      if (!allStores || allStores.length === 0) {
        allStores = getSampleStores();
      }
    }
    
    // 隐藏 loading，显示列表
    if (loadingEl) loadingEl.style.display = 'none';
    if (listEl) listEl.style.display = 'flex';
    
    applyFilters();
  }

  async function init() {
    const searchInput = document.getElementById('storeSearch');
    const listEl = document.getElementById('storesList');
    if (!listEl) return;
    
    // 初始加载数据
    await loadStoresData();
    
    // 恢复滚动位置（如果是从storepage返回）
    const savedScrollPosition = sessionStorage.getItem('storesScrollPosition');
    if (savedScrollPosition) {
      // 延迟恢复，确保页面已完全渲染
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPosition, 10));
        sessionStorage.removeItem('storesScrollPosition');
      }, 200);
    }
    
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        currentSearchKeyword = searchInput.value.trim().toLowerCase();
        applyFilters();
      });
    }
    listEl.addEventListener('click', onListClick);
    
    // 定期刷新门市数据（每分钟）
    setInterval(async () => {
      console.log('自动刷新门市数据...');
      try {
        const updatedStores = await fetchStores();
        if (updatedStores && updatedStores.length > 0) {
          allStores = updatedStores;
          applyFilters(); // 重新应用筛选和搜索
        }
      } catch (error) {
        console.error('刷新门市数据失败:', error);
      }
    }, 60 * 1000); // 1分钟 = 60000毫秒
    
    // 监听页面可见性变化（当从其他 tab 切换回来时重新加载数据）
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden) {
        // 页面变为可见时，重新加载数据
        console.log('页面变为可见，重新加载数据...');
        await loadStoresData();
      }
    });
  }

  // 示例数据，用于测试
  function getSampleStores() {
    return [
      {
        id: '1',
        name: '信義 A13',
        country: '台灣',
        city: '台北',
        hero_image_url: './assets/placeholders/store-1.jpg'
      },
      {
        id: '2',
        name: '福岡',
        country: '日本',
        city: '福岡',
        hero_image_url: './assets/placeholders/store-1.jpg'
      },
      {
        id: '3',
        name: '表參道',
        country: '日本',
        city: '東京',
        hero_image_url: './assets/placeholders/store-1.jpg'
      },
      {
        id: '4',
        name: '中環',
        country: '香港',
        city: '中環',
        hero_image_url: './assets/placeholders/store-1.jpg'
      },
      {
        id: '5',
        name: '烏節路',
        country: '新加坡',
        city: '新加坡',
        hero_image_url: './assets/placeholders/store-1.jpg'
      },
      {
        id: '6',
        name: '明洞',
        country: '韓國',
        city: '首爾',
        hero_image_url: './assets/placeholders/store-1.jpg'
      }
    ];
  }

  function applyFilters() {
    const listEl = document.getElementById('storesList');
    if (!listEl) return;

    let filtered = [...allStores];

    // 地區篩選
    if (currentRegion !== 'all' && regionMap[currentRegion]) {
      filtered = filtered.filter(s => s.country === regionMap[currentRegion]);
    }

    // 搜尋篩選
    if (currentSearchKeyword) {
      filtered = filtered.filter(s =>
        (s.name || '').toLowerCase().includes(currentSearchKeyword) ||
        (s.country || '').toLowerCase().includes(currentSearchKeyword) ||
        (s.city || '').toLowerCase().includes(currentSearchKeyword)
      );
    }

    renderList(filtered, listEl);
  }

  function filterByRegion(region) {
    currentRegion = region;
    applyFilters();
  }

  function onListClick(e) {
    // 点击卡片跳转到门市详情页
    const card = e.target.closest('[data-id]');
    if (card) {
      const id = card.getAttribute('data-id');
      // 保存当前滚动位置
      const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
      sessionStorage.setItem('storesScrollPosition', scrollPosition.toString());
      window.location.href = `./storepage.html?id=${encodeURIComponent(id)}`;
    }
  }

  // 检查是否已打卡的辅助函数
  function hasCheckin(storeId) {
    const checkins = JSON.parse(localStorage.getItem('astore.checkins') || '{}');
    const visits = checkins[storeId];
    return Array.isArray(visits) && visits.length > 0;
  }

  function renderList(items, container) {
    if (items.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999; grid-column: 1 / -1;">沒有找到符合條件的門市</div>';
      return;
    }
    container.innerHTML = items.map(s => {
      const imageUrl = s.hero_image_url || './assets/placeholders/store-1.jpg';
      const location = [s.country || '', s.city || ''].filter(Boolean).join(' · ');
      const isCheckedIn = hasCheckin(String(s.id));
      const checkinBadge = isCheckedIn ? `
        <div class="checkin-badge">
          <span class="checkin-badge-icon">✓</span>
        </div>
      ` : '';
      return `
        <div class="featured-store-card" data-id="${s.id}">
          ${checkinBadge}
          <img src="${imageUrl}" alt="${s.name || ''}" loading="lazy" onerror="this.src='./assets/placeholders/store-1.jpg'" />
          <div class="featured-store-info">
            <h4>${s.name || ''}</h4>
            <p><span class="pin-icon">📍</span> ${location || '未知地區'}</p>
          </div>
        </div>
      `;
    }).join('');
  }


  window.StoresPage = { init, filterByRegion };
})();



