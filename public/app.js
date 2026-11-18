const carGrid = document.querySelector("#car-grid");
const searchInput = document.querySelector("#search-input");
const categoryFilters = document.querySelector("#category-filters");
const toastRegion = document.querySelector("#toast-region");
const actionModal = document.querySelector("#action-modal");
const modalTitle = document.querySelector("#modal-title");
const modalDescription = document.querySelector("#modal-description");
const modalIcon = document.querySelector("#modal-icon");
const priceForm = document.querySelector("#price-form");
const priceInput = document.querySelector("#price-input");
const deleteActions = document.querySelector("#delete-actions");
let activeCar = null;
let modalAction = null;
const moneyFormatter = new Intl.NumberFormat("uz-UZ");

let cars = [];
let selectedCategory = "Hammasi";
let searchQuery = "";

function formatPrice(price) {
  return moneyFormatter.format(price);
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast${type === "error" ? " error" : ""}`;
  toast.textContent = message;
  toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

async function fetchCars() {
  carGrid.innerHTML = '<div class="loading-state"><span class="loader"></span> Katalog yuklanmoqda...</div>';
  try {
    const response = await fetch("/api/cars", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Avtomobillar ro‘yxatini olish imkoni bo‘lmadi.");
    }
    const result = await response.json();
    if (!Array.isArray(result)) {
      throw new Error("Serverdan noto‘g‘ri ro‘yxat olindi.");
    }
    cars = result;
    renderCatalog();
  } catch (error) {
    carGrid.innerHTML = "";
    const state = document.createElement("div");
    state.className = "error-state";
    state.innerHTML = "<strong>Katalogni yuklab bo‘lmadi</strong>";
    const message = document.createElement("span");
    message.textContent = error.message;
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Qayta urinish";
    retry.addEventListener("click", fetchCars);
    state.append(message, retry);
    carGrid.append(state);
  }
}

function renderStats() {
  document.querySelector("#total-cars").textContent = moneyFormatter.format(cars.length);
  document.querySelector("#nav-count").textContent = moneyFormatter.format(cars.length);
  const average = cars.length
    ? Math.round(cars.reduce((sum, car) => sum + car.price, 0) / cars.length)
    : 0;
  document.querySelector("#average-price").textContent = `${formatPrice(average)} so‘m`;
  document.querySelector("#category-count").textContent = moneyFormatter.format(
    new Set(cars.map((car) => car.category)).size
  );
}

function renderFilters() {
  const categories = ["Hammasi", ...new Set(cars.map((car) => car.category))];
  if (!categories.includes(selectedCategory)) {
    selectedCategory = "Hammasi";
  }

  categoryFilters.replaceChildren();
  for (const category of categories) {
    const button = document.createElement("button");
    button.className = `filter-button${selectedCategory === category ? " selected" : ""}`;
    button.type = "button";
    button.textContent = category;
    button.setAttribute("aria-pressed", String(selectedCategory === category));
    button.addEventListener("click", () => {
      selectedCategory = category;
      renderCatalog();
    });
    categoryFilters.append(button);
  }
}

function createActionButton(label, className, iconPath, onClick) {
  const button = document.createElement("button");
  button.className = className;
  button.type = "button";
  button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${iconPath}</svg>`;
  const text = document.createElement("span");
  text.textContent = label;
  button.append(text);
  button.addEventListener("click", onClick);
  return button;
}

function createCarCard(car) {
  const card = document.createElement("article");
  card.className = "car-card";

  const imageWrap = document.createElement("div");
  imageWrap.className = "car-image-wrap";
  const image = document.createElement("img");
  image.className = "car-image";
  image.src = car.image;
  image.alt = `${car.name} avtomobilining rasmi`;
  image.loading = "lazy";
  image.addEventListener("error", () => {
    image.src = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80";
  }, { once: true });
  const category = document.createElement("span");
  category.className = "category-tag";
  category.textContent = car.category;
  const year = document.createElement("span");
  year.className = "year-tag";
  year.textContent = String(car.year);
  imageWrap.append(image, category, year);

  const info = document.createElement("div");
  info.className = "car-info";
  const nameRow = document.createElement("div");
  nameRow.className = "car-name-row";
  const name = document.createElement("h3");
  name.className = "car-name";
  name.textContent = car.name;
  const menu = document.createElement("button");
  menu.className = "car-menu";
  menu.type = "button";
  menu.textContent = "···";
  menu.setAttribute("aria-label", `${car.name} amallari`);
  nameRow.append(name, menu);

  const specs = document.createElement("div");
  specs.className = "car-specs";
  for (const detail of [car.engine, car.transmission, car.color]) {
    const label = document.createElement("span");
    label.textContent = detail;
    specs.append(label);
    if (detail !== car.color) {
      const dot = document.createElement("span");
      dot.className = "spec-dot";
      specs.append(dot);
    }
  }

  const priceRow = document.createElement("div");
  priceRow.className = "car-price-row";
  const priceBlock = document.createElement("div");
  const caption = document.createElement("span");
  caption.className = "price-caption";
  caption.textContent = "SOTUV NARXI";
  const price = document.createElement("div");
  price.className = "car-price";
  price.append(document.createTextNode(formatPrice(car.price)));
  const unit = document.createElement("span");
  unit.className = "price-unit";
  unit.textContent = "so‘m";
  price.append(unit);
  priceBlock.append(caption, price);

  const actions = document.createElement("div");
  actions.className = "card-actions";
  const editButton = createActionButton(
    "Narxni o‘zgartirish",
    "edit-button",
    '<path d="m14.5 5.5 4 4M4 20l4.3-.9L19.2 8.2a2.8 2.8 0 0 0-4-4L4.3 15.1 4 20Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    () => openPriceEditor(car)
  );
  const deleteButton = createActionButton(
    "O‘chirish",
    "delete-button",
    '<path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    () => openDeleteConfirmation(car)
  );
  actions.append(editButton, deleteButton);
  priceRow.append(priceBlock, actions);
  info.append(nameRow, specs, priceRow);
  card.append(imageWrap, info);
  return card;
}

function renderCatalog() {
  renderStats();
  renderFilters();
  const visibleCars = cars.filter((car) => {
    const matchesCategory = selectedCategory === "Hammasi" || car.category === selectedCategory;
    const query = searchQuery.trim().toLocaleLowerCase("uz");
    const matchesSearch = !query || `${car.name} ${car.category} ${car.year}`.toLocaleLowerCase("uz").includes(query);
    return matchesCategory && matchesSearch;
  });

  document.querySelector("#result-count").textContent = moneyFormatter.format(visibleCars.length);
  carGrid.replaceChildren();
  if (!visibleCars.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const title = document.createElement("strong");
    title.textContent = cars.length ? "Mos avtomobil topilmadi" : "Katalog hozircha bo‘sh";
    const text = document.createElement("span");
    text.textContent = cars.length ? "Qidiruv so‘zini yoki kategoriyani o‘zgartirib ko‘ring." : "Avtomobillar o‘chirilgan bo‘lsa, yangi ma’lumot qo‘shish uchun serverdagi JSON faylini yangilang.";
    empty.append(title, text);
    carGrid.append(empty);
    return;
  }

  for (const car of visibleCars) {
    carGrid.append(createCarCard(car));
  }
}

function openModal(car, title, description, action, isDelete = false) {
  activeCar = car;
  modalAction = action;
  modalTitle.textContent = title;
  modalDescription.textContent = description;
  modalIcon.textContent = isDelete ? "!" : "₮";
  modalIcon.classList.toggle("danger", isDelete);
  priceForm.hidden = isDelete;
  deleteActions.hidden = !isDelete;
  actionModal.hidden = false;
  if (isDelete) {
    document.querySelector("#confirm-delete").focus();
  } else {
    priceInput.value = String(car.price);
    priceInput.focus();
    priceInput.select();
  }
}

function openPriceEditor(car) {
  openModal(
    car,
    "Narxni o‘zgartirish",
    `${car.name} uchun yangi sotuv narxini kiriting.`,
    savePrice
  );
}

function openDeleteConfirmation(car) {
  openModal(
    car,
    "Avtomobilni o‘chirish",
    `${car.name} katalogdan butunlay o‘chiriladi. Bu amalni qaytarib bo‘lmaydi.`,
    removeCar,
    true
  );
}

function closeModal() {
  actionModal.hidden = true;
  activeCar = null;
  modalAction = null;
}

async function savePrice(car) {
  const price = Number(priceInput.value);
  if (!Number.isFinite(price) || price <= 0) {
    showToast("Narx noldan katta son bo‘lishi kerak.", "error");
    return;
  }

  try {
    const response = await fetch(`/api/cars/${encodeURIComponent(car.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Narxni saqlab bo‘lmadi.");
    }
    closeModal();
    await fetchCars();
    showToast(`${car.name} narxi yangilandi.`);
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function removeCar(car) {
  try {
    const response = await fetch(`/api/cars/${encodeURIComponent(car.id)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Avtomobilni o‘chirib bo‘lmadi.");
    }
    closeModal();
    await fetchCars();
    showToast(`${car.name} katalogdan o‘chirildi.`);
  } catch (error) {
    showToast(error.message, "error");
  }
}

priceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (activeCar && modalAction) {
    modalAction(activeCar);
  }
});

document.querySelector("#confirm-delete").addEventListener("click", () => {
  if (activeCar && modalAction) {
    modalAction(activeCar);
  }
});

document.querySelectorAll("[data-close-modal], #modal-close").forEach((button) => {
  button.addEventListener("click", closeModal);
});

actionModal.addEventListener("click", (event) => {
  if (event.target === actionModal) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !actionModal.hidden) {
    closeModal();
  }
});

searchInput.addEventListener("input", (event) => {
  searchQuery = event.target.value;
  renderCatalog();
});

document.querySelector("#refresh-button").addEventListener("click", fetchCars);
document.querySelector("#current-date").textContent = new Intl.DateTimeFormat("uz-UZ", {
  day: "numeric",
  month: "long",
  year: "numeric"
}).format(new Date());

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
});

fetchCars();
