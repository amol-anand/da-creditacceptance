import { createTag, getPalette } from '../../libs/utils/utils.js';
import { getTaxonomy } from '../../scripts/taxonomy.js';

let selectedOrder = [];

function renderItem(item, catId) {
  const pathStr = item.name.split('/').slice(0, -1).join('<span class="psep"> / </span>');
  return `
  <span class="path">${pathStr}
    <span data-title="${item.title}" class="tag cat-${catId % 4}">${item.title}</span>
  </span>
`;
}

function renderItems(item, catId) {
  let html = item.hide ? '' : renderItem(item, catId);
  Object.keys(item).forEach((key) => {
    if (!['title', 'name', 'path', 'hide'].includes(key)) {
      html += renderItems(item[key], catId);
    }
  });

  return html;
}

function initTaxonomy(taxonomy) {
  let html = '';
  Object.values(taxonomy).forEach((cat, idx) => {
    html += '<div class="category">';
    html += `<h2>${cat.title}</h2>`;
    Object.keys(cat).forEach((key) => {
      if (!['title', 'name', 'path', 'hide'].includes(key)) {
        html += renderItems(cat[key], idx);
      }
    });
    html += '</div>';
  });
  const results = document.getElementById('results');
  if (!results) return;
  results.innerHTML = html;
}

function filtered() {
  const searchTerm = document.getElementById('search').value.toLowerCase();
  document.querySelectorAll('#results .tag').forEach((tag) => {
    const { title } = tag.dataset;
    const offset = title.toLowerCase().indexOf(searchTerm);
    if (offset >= 0) {
      const before = title.substring(0, offset);
      const term = title.substring(offset, offset + searchTerm.length);
      const after = title.substring(offset + searchTerm.length);
      tag.innerHTML = `${before}<span class="highlight">${term}</span>${after}`;
      tag.closest('.path').classList.remove('filtered');
    } else {
      tag.closest('.path').classList.add('filtered');
    }
  });
}

function toggleTag(target) {
  target.classList.toggle('selected');
  const { title } = target.querySelector('.tag').dataset;
  const category = target.closest('.category')
    .querySelector('h2').textContent; // Assuming category title is in h2
  const tagIdentifier = {
    title,
    category,
  };

  if (target.classList.contains('selected')) {
    selectedOrder.push(tagIdentifier); // Add to the selection order
  } else {
    selectedOrder = selectedOrder.filter(
      (item) => item.title !== title || item.category !== category,
    );
  }
  // eslint-disable-next-line no-use-before-define
  displaySelected();
}

function displaySelected() {
  const selEl = document.getElementById('selected');
  const selTagsEl = selEl.querySelector('.selected-tags');
  const toCopyBuffer = [];

  selTagsEl.innerHTML = '';
  selectedOrder.forEach(({ title, category }) => {
    // Find the category element
    const categories = document.querySelectorAll('#results .category');
    let path;
    categories.forEach((cat) => {
      if (cat.querySelector('h2').textContent === category) {
        const tag = Array.from(cat.querySelectorAll('.tag'))
          .find((t) => t.dataset.title === title);
        if (tag) {
          path = tag.closest('.path');
        }
      }
    });

    if (path) {
      const clone = path.cloneNode(true);
      clone.classList.remove('filtered', 'selected');
      const tag = clone.querySelector('.tag');
      tag.innerHTML = tag.dataset.title;
      clone.addEventListener('click', () => {
        toggleTag(path);
      });
      toCopyBuffer.push(tag.dataset.title);
      selTagsEl.append(clone);
    }
  });

  if (selectedOrder.length > 0) {
    selEl.classList.remove('hidden');
  } else {
    selEl.classList.add('hidden');
  }

  const copyBuffer = document.getElementById('copybuffer');
  copyBuffer.value = toCopyBuffer.join(', ');
}

function clickToCopyList(items) {
  items.forEach((item) => {
    item.addEventListener('click', () => {
      // Get the attribute you want to copy
      const attribute = 'data-name';
      const value = item.getAttribute(attribute);
      // Copy the attribute value to the clipboard
      navigator.clipboard.writeText(value)
        .then(() => {
          item.classList.add('copied');
          setTimeout(() => {
            item.classList.remove('copied');
          }, 2000);
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error('Failed to copy attribute:', err);
        });
    });
  });
}

async function initPalette() {
  const palette = await getPalette();
  if (!palette) return;
  const palletList = document.querySelector('#palette > ul');
  palette.forEach((color) => {
    const brandName = color['brand-name'];
    const colorValue = color['color-value'];
    const swatch = createTag('div', { class: 'swatch', style: `background: ${colorValue};` });
    const label = createTag('div', { class: 'label' }, `<p>${brandName}</p><p class="value">${colorValue}</p>`);
    const colorElem = createTag('li', { class: brandName, 'data-color': colorValue, 'data-name': brandName }, label);
    colorElem.prepend(swatch);
    palletList.append(colorElem);
  });
  const items = palletList.querySelectorAll('li');
  if (items) clickToCopyList(items);
}

async function init() {
  const tax = await getTaxonomy();
  initTaxonomy(tax);
  initPalette();
  const selEl = document.getElementById('selected');
  const copyButton = selEl.querySelector('button.copy');
  copyButton.addEventListener('click', () => {
    const copyText = document.getElementById('copybuffer');
    navigator.clipboard.writeText(copyText.value);

    copyButton.disabled = true;
  });

  const clearButton = selEl.querySelector('button.clear');
  clearButton.addEventListener('click', () => {
    // Remove the 'filtered' class from all tags
    document.querySelectorAll('#results .tag')
      .forEach((tag) => {
        tag.closest('.path')
          .classList
          .remove('filtered');
      });

    // Remove the 'selected' class from all selected tags
    document.querySelectorAll('.selected')
      .forEach((selectedTag) => {
        selectedTag.classList.remove('selected');
      });

    selectedOrder = [];
    displaySelected();
    copyButton.disabled = false;
  });

  document.querySelector('#search').addEventListener('keyup', filtered);

  document.addEventListener('click', (e) => {
    const target = e.target.closest('.category .path');
    if (target) {
      toggleTag(target);
    }
  });
}

init();
