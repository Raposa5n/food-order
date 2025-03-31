
let categories = JSON.parse(localStorage.getItem("categories")) || {
    "吐司": [], "蛋餅": [], "漢堡": [], "燒餅": []
};
let currentCategory = localStorage.getItem("currentCategory") || "吐司";
let orders = [];

function switchPage(page) {
    document.getElementById("order-page").style.display = page === 'order' ? 'block' : 'none';
    document.getElementById("history-page").style.display = page === 'history' ? 'block' : 'none';

    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.includes("點餐") && page === 'order') btn.classList.add('active');
        if (btn.textContent.includes("歷史") && page === 'history') btn.classList.add('active');
    });

    if (page === 'order') {
        renderCategories();
        setCategory(currentCategory);
    } else {
        renderChart();
        renderOrders();
    }
}


function updateTime() {
    document.getElementById("current-time").innerText = `現在時間：${new Date().toLocaleTimeString()}`;
}
setInterval(updateTime, 1000);
updateTime();

function renderCategories() {
    const container = document.getElementById("category-buttons");
    container.innerHTML = "";
    Object.keys(categories).forEach(cat => {
        const btn = document.createElement("button");
        btn.className = `btn m-1 ${cat === currentCategory ? 'active-category' : 'btn-outline-secondary'}`;
        btn.innerText = cat;
        btn.onclick = () => setCategory(cat);
        container.appendChild(btn);
    });
}

function setCategory(cat) {
    currentCategory = cat;
    localStorage.setItem("currentCategory", currentCategory);
    renderCategories();
    renderMenu();
}

function addCategory() {
    const name = document.getElementById("new-category-name").value.trim();
    if (name && !categories[name]) {
        categories[name] = [];
        localStorage.setItem("categories", JSON.stringify(categories));
        currentCategory = name;
        renderCategories();
        renderMenu();
    }
}

function deleteCategory() {
    if (confirm(`確定刪除分類 ${currentCategory}？`)) {
        delete categories[currentCategory];
        const keys = Object.keys(categories);
        currentCategory = keys.length ? keys[0] : "";
        localStorage.setItem("categories", JSON.stringify(categories));
        localStorage.setItem("currentCategory", currentCategory);
        renderCategories();
        renderMenu();
    }
}

function renderMenu() {
    const menu = document.getElementById("menu");
    menu.innerHTML = "";

    categories[currentCategory]?.forEach((item, i) => {
        const price = parseFloat(item.price) || 0;
        const div = document.createElement("div");
        div.className = "d-flex align-items-center justify-content-between p-2 mb-2 border rounded";
        div.setAttribute("data-name", item.name);
        div.innerHTML = `
            <span>${item.name}</span>
            <span>$${price.toFixed(2)}</span>
            <div>
                <button class="btn btn-sm btn-outline-success" onclick="addToOrder('${item.name}', ${price}, '${currentCategory}')">加入點餐</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteMenuItemByName('${item.name}')">刪除</button>
            </div>`;
        menu.appendChild(div);
    });

    // 延遲初始化 Sortable，確保元素都渲染完成
    setTimeout(() => {
        if (window.sortableMenu) window.sortableMenu.destroy();
        window.sortableMenu = Sortable.create(menu, {
            animation: 150,
            onEnd: function () {
                const items = Array.from(menu.children);
                const newOrder = items.map(el => {
                    const name = el.getAttribute("data-name");
                    return categories[currentCategory].find(item => item.name === name);
                });
                categories[currentCategory] = newOrder;
                localStorage.setItem("categories", JSON.stringify(categories));
            }
        });
    }, 0);
}
function deleteMenuItemByName(name) {
    const index = categories[currentCategory].findIndex(item => item.name === name);
    if (index >= 0 && confirm("確定要刪除這個品項嗎？")) {
        categories[currentCategory].splice(index, 1);
        localStorage.setItem("categories", JSON.stringify(categories));
        renderMenu();
    }
}


function addMenuItem() {
    const name = document.getElementById("new-item-name").value.trim();
    const price = parseFloat(document.getElementById("new-item-price").value);
    if (name && !isNaN(price)) {
        categories[currentCategory].push({ name, price });
        localStorage.setItem("categories", JSON.stringify(categories));
        renderMenu();
        document.getElementById("new-item-name").value = "";
        document.getElementById("new-item-price").value = "";
    }
}

function deleteMenuItem(index) {
    if (confirm("確定要刪除這個品項嗎？")) {
        categories[currentCategory].splice(index, 1);
        localStorage.setItem("categories", JSON.stringify(categories));
        renderMenu();
    }
}

function addToOrder(name, price, category) {
    const displayName = `${name}${category ? `（${category}）` : ""}`;
    const found = orders.find(o => o.name === displayName);
    if (found) {
        found.quantity++;
    } else {
        orders.push({ name: displayName, baseName: name, category, price, quantity: 1 });
    }
    updateOrderList();
}

function updateOrderList() {
    const list = document.getElementById("order-list");
    list.innerHTML = "";
    let total = 0;
    orders.forEach((item, i) => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        const row = document.createElement("div");
        row.className = "d-flex justify-content-between border-bottom p-2";
        row.innerHTML = `
          <span>${item.name} x${item.quantity}</span>
          <span>$${subtotal.toFixed(2)}</span>
          <button class="btn btn-sm btn-outline-danger" onclick="changeQty(${i}, -1)">-</button>
          <button class="btn btn-sm btn-outline-success" onclick="changeQty(${i}, 1)">+</button>
          <button class="btn btn-sm btn-outline-dark" onclick="removeItem(${i})">刪除</button>`;
        list.appendChild(row);
    });
    document.getElementById("total-price").innerText = `總價: $${total.toFixed(2)}`;
}

function changeQty(index, change) {
    orders[index].quantity += change;
    if (orders[index].quantity <= 0) orders.splice(index, 1);
    updateOrderList();
}

function removeItem(index) {
    orders.splice(index, 1);
    updateOrderList();
}

function getCategoryByItemName(name) {
    for (const cat in categories) {
        if (categories[cat].some(item => item.name === name)) {
            return cat;
        }
    }
    return "未分類";
}

function completeOrder() {
    if (orders.length === 0) return alert("請先點餐");

    const all = JSON.parse(localStorage.getItem("finishedOrders")) || [];

    all.push({
        time: new Date().toISOString(),
        items: orders.map(o => ({ ...o }))  // ✅ 直接存現成的 orders 就行
    });

    localStorage.setItem("finishedOrders", JSON.stringify(all));
    orders = [];
    updateOrderList();
    alert("訂單已完成");
}



function applyDateFilter() {
    const date = document.getElementById("filter-date").value;
    if (!date) return;
    const all = JSON.parse(localStorage.getItem("finishedOrders")) || [];
    const filtered = all.filter(o => o.time.startsWith(date));
    renderOrders(filtered);
}

function clearFilter() {
    document.getElementById("filter-date").value = "";
    renderOrders();
}

function exportToExcel() {
    const rows = [["時間", "品項名稱", "數量", "單價", "總價"]];
    const all = JSON.parse(localStorage.getItem("finishedOrders")) || [];
    all.forEach(order => {
        order.items.forEach(item => {
            rows.push([order.time, item.name, item.quantity, item.price, item.price * item.quantity]);
        });
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "訂單紀錄");
    XLSX.writeFile(wb, "訂單紀錄.xlsx");
}

function renderOrders(data = null) {
    const ordersData = data || JSON.parse(localStorage.getItem("finishedOrders")) || [];
    const accordion = document.getElementById("ordersAccordion");
    accordion.innerHTML = "";
    ordersData.forEach((order, i) => {
        const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const detail = order.items.map(item => `<li>${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</li>`).join("");
        accordion.innerHTML += `
          <div class="accordion-item">
            <h2 class="accordion-header" id="h${i}">
              <button class="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#c${i}">${order.time} - 總金額：$${total.toFixed(2)}</button>
            </h2>
            <div id="c${i}" class="accordion-collapse collapse"><div class="accordion-body"><ul>${detail}</ul></div></div>
          </div>`;
    });
}

function renderChart() {
    const all = JSON.parse(localStorage.getItem("finishedOrders")) || [];
    const stats = {}, cats = JSON.parse(localStorage.getItem("categories")) || {}, labels = [], values = [];
    let total = 0;
    all.forEach(order => {
        order.items.forEach(item => {
            const cat = item.category || getCategoryByItemName(item.name) || "未分類";
            stats[cat] = (stats[cat] || 0) + item.price * item.quantity;
            total += item.price * item.quantity;
        });
    });
    for (const k in stats) {
        labels.push(k);
        values.push(stats[k]);
    }
    labels.push("當日總金額");
    values.push(total);

    const ctx = document.getElementById("categoryChart").getContext("2d");
    if (window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: '分類銷售金額', data: values }] },
        options: { scales: { y: { beginAtZero: true } } }
    });
}

// 等待 DOM 和 Sortable 都準備好後再初始化
window.addEventListener('DOMContentLoaded', () => {
    renderCategories();
    setCategory(currentCategory);
});


let itemInputCount = 1;

function createItemInput(index) {
    return `
    <div class="row g-2 align-items-center mb-2" id="item-input-${index}">
      <div class="col"><input type="text" class="form-control" placeholder="品項名稱" id="item-name-${index}"></div>
      <div class="col"><input type="number" class="form-control" placeholder="價格" min="0" step="0.01" id="item-price-${index}"></div>
    </div>`;
}

function renderItemInputs() {
    const container = document.getElementById("multi-item-container");
    container.innerHTML = "";
    for (let i = 0; i < itemInputCount; i++) {
        container.innerHTML += createItemInput(i);
    }
}

function addItemInput() {
    if (itemInputCount >= 5) return alert("最多只能新增 5 項");
    itemInputCount++;
    renderItemInputs();
}

function removeItemInput() {
    if (itemInputCount <= 1) return;
    itemInputCount--;
    renderItemInputs();
}

function addMultipleItems() {
    let added = 0;
    for (let i = 0; i < itemInputCount; i++) {
        const name = document.getElementById(`item-name-${i}`).value.trim();
        const price = parseFloat(document.getElementById(`item-price-${i}`).value);
        if (name && !isNaN(price)) {
            categories[currentCategory].push({ name, price });
            added++;
        }
    }
    if (added > 0) {
        localStorage.setItem("categories", JSON.stringify(categories));
        renderMenu();
        renderItemInputs();
    } else {
        alert("請輸入有效的名稱與價格");
    }
}

renderItemInputs();
