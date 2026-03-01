(function () {
  async function init() {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) return;
    const stores = getStoredStores();
    const store = stores.find(s => String(s.id) === String(id));
    if (!store) return;
    
    // 立即渲染其他内容（不等待图片）
    render(store);
    
    // 只等待图片加载完成
    const carouselTrack = document.getElementById('carouselTrack');
    const carouselIndicators = document.getElementById('carouselIndicators');
    if (carouselTrack && carouselIndicators) {
      await renderCarousel(store, carouselTrack, carouselIndicators);
    }
    
    // 隐藏图片区域的 loading
    const carouselLoading = document.getElementById('carouselLoading');
    if (carouselLoading) {
      carouselLoading.style.display = 'none';
    }
    
    bindActions(store);
  }

  function render(store) {
    const nameEl = document.getElementById('storeName');
    const addrEl = document.getElementById('storeAddress');
    const phoneEl = document.getElementById('storePhone');
    const hoursEl = document.getElementById('storeHours');
    const descEl = document.getElementById('storeDesc');
    const locationEl = document.getElementById('storeLocation');
    const mapStoreNameEl = document.getElementById('mapStoreName');
    const mapAddressEl = document.getElementById('mapAddress');
    const headerFavBtn = document.getElementById('headerFavoriteBtn');
    const navBtn = document.getElementById('btnNavigate');

    // 立即渲染其他内容（不等待图片）
    if (nameEl) nameEl.textContent = store.name || '';
    if (addrEl) addrEl.textContent = store.address || '';
    if (phoneEl) phoneEl.textContent = store.phone || '0800-020-010';
    if (descEl) descEl.textContent = store.description || '這裡是門市描述的佔位文字，介紹門市特色與空間設計。';
    if (locationEl) {
      const location = [store.country || '台灣', store.city || '台北'].filter(Boolean).join(', ');
      locationEl.textContent = location;
    }
    if (mapStoreNameEl) mapStoreNameEl.textContent = store.name ? `Apple ${store.name}` : 'Apple 信義 A13';
    if (mapAddressEl) mapAddressEl.textContent = store.address || '11051臺北市信義區松壽路13號';
    
    if (hoursEl && Array.isArray(store.hours)) {
      const weekdayNames = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
      // 按照星期一到星期日的顺序排列
      const sortedHours = [
        store.hours.find(h => h.weekday === 1), // 星期一
        store.hours.find(h => h.weekday === 2), // 星期二
        store.hours.find(h => h.weekday === 3), // 星期三
        store.hours.find(h => h.weekday === 4), // 星期四
        store.hours.find(h => h.weekday === 5), // 星期五
        store.hours.find(h => h.weekday === 6), // 星期六
        store.hours.find(h => h.weekday === 0)  // 星期日
      ].filter(Boolean);
      
      hoursEl.innerHTML = sortedHours.map((h, idx) => {
        const dayName = weekdayNames[idx];
        // 如果有特殊文字（如「休息」、「always open」），優先顯示特殊文字
        if (h.text) {
          return `<div class="hours-item">${dayName} ${h.text}</div>`;
        }
        // 否則顯示時間範圍
        if (h.open && h.close) {
          return `<div class="hours-item">${dayName} ${h.open}-${h.close}</div>`;
        }
        // 如果都沒有，顯示預設值
        return `<div class="hours-item">${dayName} 11:00-21:30</div>`;
      }).join('');
    } else if (hoursEl) {
      // 默认营业时间
      const defaultHours = [
        '星期一 11:00-21:30',
        '星期二 11:00-21:30',
        '星期三 11:00-21:30',
        '星期四 11:00-21:30',
        '星期五 11:00-21:30',
        '星期六 11:00-21:30',
        '星期日 11:00-21:30'
      ];
      hoursEl.innerHTML = defaultHours.map(h => `<div class="hours-item">${h}</div>`).join('');
    }
    
    if (headerFavBtn) setHeaderFavButton(headerFavBtn, store.id);
    if (navBtn && store.google_map_url) {
      navBtn.href = store.google_map_url;
      navBtn.target = '_blank';
      navBtn.rel = 'noopener';
    }
    
    // 渲染 Google Map iframe
    renderMapIframe(store);
  }
  
  // 渲染 Google Map iframe
  function renderMapIframe(store) {
    const mapSection = document.querySelector('.store-map-section .store-map');
    if (!mapSection || !store.google_map_iframe) return;
    
    // 清空现有内容并插入 iframe
    mapSection.innerHTML = '';
    mapSection.innerHTML = store.google_map_iframe;
  }

  // 渲染圖片輪播（等待所有图片加载完成）
  async function renderCarousel(store, trackEl, indicatorsEl) {
    // 收集所有圖片：hero_image_url + gallery_images
    const images = [];
    
    // 添加主圖
    if (store.hero_image_url) {
      images.push(store.hero_image_url);
    }
    
    // 添加畫廊圖片（過濾空值）
    if (Array.isArray(store.gallery_images)) {
      store.gallery_images.forEach(url => {
        if (url && url.trim()) {
          images.push(url);
        }
      });
    }
    
    // 如果沒有圖片，使用預設圖片
    if (images.length === 0) {
      images.push('./assets/placeholders/store-1.jpg');
    }
    
    // 清空現有內容
    trackEl.innerHTML = '';
    indicatorsEl.innerHTML = '';
    
    // 創建圖片滑動項目
    const imagePromises = images.map((url, index) => {
      return new Promise((resolve) => {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';
        slide.dataset.index = index;
        
        const img = document.createElement('img');
        img.src = url;
        img.alt = store.name || 'Store';
        img.onerror = function() {
          this.src = './assets/placeholders/store-1.jpg';
          // 即使出错也继续加载
          resolve();
        };
        img.onload = () => resolve();
        
        slide.appendChild(img);
        trackEl.appendChild(slide);
        
        // 創建指示器
        const indicator = document.createElement('button');
        indicator.className = 'carousel-indicator';
        if (index === 0) indicator.classList.add('active');
        indicator.setAttribute('aria-label', `跳轉到圖片 ${index + 1}`);
        indicator.addEventListener('click', () => goToSlide(index));
        indicatorsEl.appendChild(indicator);
      });
    });
    
    // 等待所有图片加载完成
    await Promise.all(imagePromises);
    
    // 如果只有一張圖片，隱藏指示器
    if (images.length <= 1) {
      indicatorsEl.style.display = 'none';
    } else {
      indicatorsEl.style.display = 'flex';
    }
    
    // 初始化原生滚动功能（在所有图片加载完成后）
    initCarouselScroll(trackEl, images.length);
  }

  // 初始化原生滚动功能
  function initCarouselScroll(trackEl, totalSlides) {
    if (totalSlides <= 1) return;
    
    const container = trackEl.parentElement;
    if (!container) return;
    
    // 移除 transform，改用原生滚动
    trackEl.style.transform = 'none';
    trackEl.style.transition = 'none';
    
    // 确保每张图片宽度等于容器宽度（100vw）
    const slideWidth = window.innerWidth;
    trackEl.querySelectorAll('.carousel-slide').forEach(slide => {
      slide.style.width = slideWidth + 'px';
      slide.style.minWidth = slideWidth + 'px';
      slide.style.maxWidth = slideWidth + 'px';
    });
    
    // 监听滚动事件，更新指示器
    const updateIndicators = () => {
      const scrollLeft = container.scrollLeft;
      const currentIndex = Math.round(scrollLeft / slideWidth);
      
      const indicators = document.querySelectorAll('.carousel-indicator');
      indicators.forEach((indicator, i) => {
        if (i === currentIndex) {
          indicator.classList.add('active');
        } else {
          indicator.classList.remove('active');
        }
      });
    };
    
    // 使用 passive: true 以提升性能
    container.addEventListener('scroll', updateIndicators, { passive: true });
    
    // 监听窗口大小变化，更新图片宽度
    const handleResize = () => {
      const newWidth = window.innerWidth;
      trackEl.querySelectorAll('.carousel-slide').forEach(slide => {
        slide.style.width = newWidth + 'px';
        slide.style.minWidth = newWidth + 'px';
        slide.style.maxWidth = newWidth + 'px';
      });
      // 重新计算当前索引
      updateIndicators();
    };
    
    window.addEventListener('resize', handleResize, { passive: true });
    
    // 初始更新指示器
    updateIndicators();
  }

  // 跳轉到指定滑動（用于指示器点击）
  function goToSlide(index) {
    const trackEl = document.getElementById('carouselTrack');
    const container = trackEl ? trackEl.parentElement : null;
    
    if (!container) return;
    
    const totalSlides = trackEl.children.length;
    if (index < 0 || index >= totalSlides) return;
    
    // 使用原生滚动，每张图片宽度为窗口宽度
    const slideWidth = window.innerWidth;
    container.scrollTo({
      left: slideWidth * index,
      behavior: 'smooth'
    });
  }

  function bindActions(store) {
    // Header 收藏按钮
    const headerFavBtn = document.getElementById('headerFavoriteBtn');
    if (headerFavBtn) {
      headerFavBtn.addEventListener('click', () => {
        toggleFavorite(store.id);
        setHeaderFavButton(headerFavBtn, store.id);
      });
    }
    
    // 打卡按钮
    const checkinBtn = document.getElementById('btnCheckin');
    const checkinSuccess = document.getElementById('checkinSuccess');
    const checkinDateText = document.getElementById('checkinDateText');
    const verifiedBadge = document.getElementById('verifiedBadge');
    const verifyLocationBtn = document.getElementById('btnVerifyLocation');
    
    if (checkinBtn) {
      // 检查是否已经打卡
      const checkins = getCheckins(store.id);
      if (checkins && checkins.length > 0) {
        const lastCheckin = checkins[checkins.length - 1];
        showCheckinSuccess(lastCheckin, store);
      }
      
      checkinBtn.addEventListener('click', async () => {
        const today = new Date().toISOString().slice(0, 10);
        const result = await addCheckin(store.id, store);
        showCheckinSuccess(today, store, result.verified);
      });
    }

    // 验证定位按钮
    if (verifyLocationBtn) {
      verifyLocationBtn.addEventListener('click', async () => {
        const verification = await verifyLocation(store);
        if (verification.verified) {
          showToast('驗證成功');
          saveVerificationStatus(store.id, true);
          updateVerificationUI(store.id);
        } else {
          showToast('哇！距離太遠驗證失敗');
        }
      });
    }
    
    function showCheckinSuccess(date, store, verifiedFromCheckin) {
      if (checkinBtn) checkinBtn.style.display = 'none';
      if (checkinSuccess) {
        checkinSuccess.style.display = 'block';
        const dateStr = typeof date === 'string' ? date : date.toISOString().slice(0, 10);
        const formattedDate = dateStr.replace(/-/g, '/');
        if (checkinDateText) checkinDateText.textContent = `已於${formattedDate} 造訪`;
        
        // 更新验证状态UI
        updateVerificationUI(store.id, verifiedFromCheckin);
      }
    }

    function updateVerificationUI(storeId, verifiedFromCheckin) {
      const isVerified = verifiedFromCheckin !== undefined 
        ? verifiedFromCheckin 
        : getVerificationStatus(storeId);
      
      // 显示/隐藏验证成功icon
      if (verifiedBadge) {
        if (isVerified) {
          verifiedBadge.style.display = 'inline-block';
        } else {
          verifiedBadge.style.display = 'none';
        }
      }
      
      // 显示/隐藏验证定位按钮
      if (verifyLocationBtn) {
        if (isVerified) {
          verifyLocationBtn.style.display = 'none';
        } else {
          verifyLocationBtn.style.display = 'flex';
        }
      }
    }
  }
  
  function getCheckins(id) {
    const key = 'astore.checkins';
    const map = JSON.parse(localStorage.getItem(key) || '{}');
    return map[id] || [];
  }

  function setFavButton(btn, id) {
    const favs = getFavorites();
    const on = favs.includes(String(id));
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = on ? '已收藏' : '收藏';
  }
  
  function setHeaderFavButton(btn, id) {
    const favs = getFavorites();
    const on = favs.includes(String(id));
    btn.setAttribute('aria-pressed', String(on));
    if (on) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  function getFavorites() {
    return JSON.parse(localStorage.getItem('astore.favorites') || '[]');
  }
  function toggleFavorite(id) {
    const favs = getFavorites();
    const idx = favs.indexOf(String(id));
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push(String(id));
    localStorage.setItem('astore.favorites', JSON.stringify(favs));
  }

  // 计算两点之间的距离（使用 Haversine 公式，返回米）
  function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // 地球半径（米）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // 获取用户位置
  function getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  // 验证位置距离
  async function verifyLocation(store) {
    try {
      if (!store.coords || !store.coords.lat || !store.coords.lng) {
        return { verified: false, distance: null };
      }

      const userLocation = await getUserLocation();
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        store.coords.lat,
        store.coords.lng
      );

      const verified = distance < 500; // 500米
      return { verified, distance };
    } catch (error) {
      console.error('获取位置失败:', error);
      return { verified: false, distance: null, error: error.message };
    }
  }

  // 保存验证状态到 localStorage
  function saveVerificationStatus(storeId, verified) {
    const key = 'astore.verifications';
    const map = JSON.parse(localStorage.getItem(key) || '{}');
    map[storeId] = verified;
    localStorage.setItem(key, JSON.stringify(map));
  }

  // 获取验证状态
  function getVerificationStatus(storeId) {
    const key = 'astore.verifications';
    const map = JSON.parse(localStorage.getItem(key) || '{}');
    return map[storeId] === true;
  }

  // 显示 Toast 提示
  function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.style.display = 'flex';
    
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  }

  async function addCheckin(id, store) {
    const key = 'astore.checkins';
    const map = JSON.parse(localStorage.getItem(key) || '{}');
    const today = new Date().toISOString().slice(0, 10);
    const arr = Array.isArray(map[id]) ? map[id] : [];
    if (!arr.includes(today)) arr.push(today);
    map[id] = arr;
    localStorage.setItem(key, JSON.stringify(map));
    
    // 验证位置
    let verified = false;
    if (store && store.coords) {
      const verification = await verifyLocation(store);
      verified = verification.verified;
      if (verified) {
        saveVerificationStatus(id, true);
      }
    }
    
    // 确保勋章数据已加载
    let medals = getStoredMedals();
    if (!medals || medals.length === 0) {
      try {
        medals = await fetchMedals();
      } catch (error) {
        console.error('获取勋章数据失败:', error);
      }
    }
    
    // 打卡后检查并解锁勋章
    let newMedals = [];
    if (typeof checkAndUnlockBadges === 'function') {
      // 获取解锁前的勋章列表
      const beforeUnlocked = JSON.parse(localStorage.getItem('astore.unlockedBadges') || '[]');
      const beforeSet = new Set(beforeUnlocked.map(id => String(id)));
      
      // 执行解锁检查
      const afterUnlocked = checkAndUnlockBadges() || [];
      
      // 找出新获得的勋章
      newMedals = afterUnlocked.filter(id => !beforeSet.has(String(id)));
      
      // 如果有新获得的勋章，显示恭喜弹窗
      if (newMedals.length > 0) {
        // 获取勋章详情
        const medals = getStoredMedals();
        const newMedalDetails = newMedals.map(medalId => {
          return medals.find(m => String(m.id) === String(medalId));
        }).filter(Boolean);
        
        if (newMedalDetails.length > 0) {
          // 显示第一个新获得的勋章（如果有多个，只显示第一个）
          showMedalCongrats(newMedalDetails[0]);
        }
      }
    }

    return { verified, newMedals };
  }

  // 显示恭喜获得勋章弹窗
  function showMedalCongrats(medal) {
    const modal = document.getElementById('medalCongratsModal');
    const medalEl = document.getElementById('medalCongratsMedal');
    const nameEl = document.getElementById('medalCongratsName');
    const closeBtn = document.getElementById('medalCongratsClose');
    const viewBtn = document.getElementById('medalCongratsView');
    
    if (!modal || !medalEl || !nameEl) return;
    
    // 显示勋章（样式同成就页）
    medalEl.innerHTML = `
      <div class="flag-circle" style="background: #0088FF;">
        <span class="flag-emoji">${medal.image || '🍎'}</span>
      </div>
    `;
    
    // 显示勋章名称
    nameEl.textContent = medal.name || '未知勳章';
    
    // 显示弹窗
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // 关闭按钮
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      };
    }
    
    // 查看成就按钮
    if (viewBtn) {
      viewBtn.onclick = () => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        window.location.href = './achievements.html';
      };
    }
    
    // 点击背景关闭
    const backdrop = modal.querySelector('.medal-congrats-backdrop');
    if (backdrop) {
      backdrop.onclick = () => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      };
    }
  }

  function weekdayName(n) {
    const names = ['日', '一', '二', '三', '四', '五', '六'];
    const idx = Math.max(0, Math.min(6, Number(n)));
    return `週${names[idx]}`;
  }

  function mapLink(lat, lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
  }

  window.StoreDetailPage = { init };
})();



