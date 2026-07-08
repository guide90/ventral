(function () {
  function formatMoney(cents) {
    if (window.theme && theme.Currency && theme.Currency.formatMoney) {
      return theme.Currency.formatMoney(cents, theme.settings.moneyFormat);
    }

    var value = (Number(cents || 0) / 100).toFixed(2);
    return "$" + value;
  }

  function normalizeSectionContent(root) {
    root.querySelectorAll(".faq-content-list").forEach(function (list) {
      list.classList.add("ventral-pdp__faq-list");
      list.querySelectorAll(".faq-item").forEach(function (item, index) {
        item.classList.add("ventral-pdp__faq-item");

        var title = item.querySelector(".uk-accordion-title");
        var content = item.querySelector(".uk-accordion-content");
        if (!title || !content || item.querySelector("summary")) return;

        var details = document.createElement("details");
        details.className = item.className;
        if (item.classList.contains("uk-open") || index === 0) details.open = true;

        var summary = document.createElement("summary");
        summary.innerHTML = title.innerHTML;

        var answer = document.createElement("div");
        answer.className = "ventral-pdp__faq-answer rte";
        answer.innerHTML = content.innerHTML;

        details.appendChild(summary);
        details.appendChild(answer);
        item.replaceWith(details);
      });
    });

    root.querySelectorAll("img").forEach(function (image) {
      if (!image.hasAttribute("loading")) image.setAttribute("loading", "lazy");
    });
  }

  class PageProductDetail extends HTMLElement {
    connectedCallback() {
      var className = this.dataset.value;
      if (!className) return;

      var sections = document.querySelectorAll("." + className + ".shopify-section");
      var source = null;

      sections.forEach(function (section) {
        var hidden = section.querySelector(".uk-hidden");
        if (hidden) source = hidden;
      });

      if (!source) {
        if (!this.innerHTML.trim()) {
          var panel = this.closest("[data-pdp-tab-panel]");
          var target = panel && panel.getAttribute("data-pdp-tab-panel");
          if (panel) panel.hidden = true;
          document.querySelectorAll("[data-pdp-tab-target='" + target + "']").forEach(function (button) {
            button.hidden = true;
          });
        }
        return;
      }

      this.innerHTML = source.innerHTML;
      normalizeSectionContent(this);
    }
  }

  if (!customElements.get("page-product-detail")) {
    customElements.define("page-product-detail", PageProductDetail);
  }

  class BuyNow extends HTMLElement {
    constructor() {
      super();
      this.onQuantityChange = this.onQuantityChange.bind(this);
    }

    static get observedAttributes() {
      return ["data-id", "data-number", "data-available"];
    }

    connectedCallback() {
      document.addEventListener("quantity:change", this.onQuantityChange);
      this.id = Number(this.dataset.id);
      this.number = Number(this.dataset.number) || 1;
      this.available = this.dataset.available === "true";
      this.addEventListener("click", this.onClick);
    }

    disconnectedCallback() {
      document.removeEventListener("quantity:change", this.onQuantityChange);
      this.removeEventListener("click", this.onClick);
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;
      if (name === "data-id") this.id = Number(newValue);
      if (name === "data-number") this.number = Number(newValue) || 1;
      if (name === "data-available") this.available = newValue === "true";
    }

    onQuantityChange(event) {
      var detail = event.detail || {};
      var qty = detail.qty || detail.number;
      if (qty) this.dataset.number = qty;
    }

    onClick = async (event) => {
      var target = event.target.closest(".buy-now, .add-to-cart");
      if (!target || this.available === false || !this.id) return;

      event.preventDefault();
      target.classList.add("is-loading");

      try {
        var response = await fetch(theme.routes.cartAdd, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            id: this.id,
            quantity: this.number || 1
          })
        });

        var result = await response.json();
        target.classList.remove("is-loading");

        if (result.status === 422) {
          window.alert(result.description || "Please try again.");
          return;
        }

        if (target.classList.contains("buy-now")) {
          window.location.href = "/cart/" + this.id + ":" + (this.number || 1);
          return;
        }

        if (theme.settings.cartType === "page") {
          window.location = theme.routes.cartPage;
        } else {
          document.dispatchEvent(new CustomEvent("ajaxProduct:added", {
            detail: { product: result, addToCartBtn: target },
            bubbles: true
          }));
        }
      } catch (error) {
        target.classList.remove("is-loading");
        console.error(error);
      }
    };
  }

  if (!customElements.get("buy-now")) {
    customElements.define("buy-now", BuyNow);
  }

  function initTabs(root) {
    var buttons = root.querySelectorAll("[data-pdp-tab-target]");
    var panels = root.querySelectorAll("[data-pdp-tab-panel]");

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var target = button.getAttribute("data-pdp-tab-target");

        buttons.forEach(function (item) {
          var active = item === button;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-selected", active ? "true" : "false");
        });

        panels.forEach(function (panel) {
          var active = panel.getAttribute("data-pdp-tab-panel") === target;
          panel.classList.toggle("is-active", active);
          panel.hidden = !active;
        });
      });
    });
  }

  function initGalleryArrows(root) {
    var gallery = root.querySelector("[data-product-photos]");
    if (!gallery) return;

    var previousButtons = root.querySelectorAll("[data-ventral-gallery-prev]");
    var nextButtons = root.querySelectorAll("[data-ventral-gallery-next]");

    var selectRelative = function (direction) {
      var flickity = window.Flickity && Flickity.data(gallery);
      if (flickity) {
        if (direction < 0) {
          flickity.previous(true);
        } else {
          flickity.next(true);
        }
        return;
      }

      var slides = Array.prototype.slice.call(gallery.querySelectorAll(".product-main-slide"));
      if (slides.length < 2) return;

      var current = slides.findIndex(function (slide) {
        return slide.classList.contains("is-selected") || slide.classList.contains("starting-slide");
      });
      var target = (Math.max(current, 0) + direction + slides.length) % slides.length;
      var thumb = root.querySelector("[data-product-thumb][data-index='" + target + "']");
      if (thumb) thumb.click();
    };

    previousButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        selectRelative(-1);
      });
    });

    nextButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        selectRelative(1);
      });
    });
  }

  function initFixedBar(root) {
    var fixedBar = root.querySelector("[data-ventral-fixed-bar]");
    var form = root.querySelector(".product-single__form");
    if (!fixedBar || !form) return;

    var fixedAdd = fixedBar.querySelector("[data-fixed-add]");
    var fixedBuy = fixedBar.querySelector("[data-fixed-buy]");
    var fixedPrice = fixedBar.querySelector("[data-fixed-price]");
    var fixedCompare = fixedBar.querySelector("[data-fixed-compare]");
    var fixedVariant = fixedBar.querySelector("[data-fixed-variant]");
    var buyNow = fixedBar.querySelector("buy-now");

    root.querySelectorAll(".ventral-pdp__quantity .js-qty__num").forEach(function (input) {
      var syncQuantity = function () {
        if (!buyNow) return;
        var value = parseInt(input.value, 10);
        buyNow.dataset.number = value > 0 ? value : 1;
      };

      input.addEventListener("change", syncQuantity);
      input.addEventListener("input", syncQuantity);
    });

    root.addEventListener("variantChange", function (event) {
      var variant = event.detail && event.detail.variant;
      if (!variant) return;

      if (fixedPrice) fixedPrice.textContent = formatMoney(variant.price);

      if (fixedCompare) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          fixedCompare.textContent = formatMoney(variant.compare_at_price);
          fixedCompare.hidden = false;
        } else {
          fixedCompare.hidden = true;
        }
      }

      if (fixedVariant) fixedVariant.textContent = variant.title;

      if (fixedAdd) {
        fixedAdd.textContent = "Add to cart";
        fixedAdd.style.display = variant.available ? "flex" : "none";
      }

      if (fixedBuy) {
        fixedBuy.textContent = variant.available ? "Buy it now" : "Sold Out";
        fixedBuy.classList.toggle("is-disabled", !variant.available);
      }

      if (buyNow) {
        buyNow.dataset.id = variant.id;
        buyNow.dataset.available = variant.available ? "true" : "false";
        buyNow.classList.toggle("is-disabled", !variant.available);
      }
    });
  }

  function initProduct(root) {
    initTabs(root);
    initFixedBar(root);
    initGalleryArrows(root);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".ventral-pdp").forEach(initProduct);
  });
})();
