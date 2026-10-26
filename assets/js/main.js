(function ($) {
  "use strict";

  const PAGE_PATHS = {
    detail: "pages/detail.html",
    payment: "pages/payment.html",
  };

  const PAGE_TITLES = {
    home: "Arjuno RentCar",
    detail: "Detail Mobil | Arjuno RentCar",
    payment: "Pembayaran | Arjuno RentCar",
  };

  const DEMO_VEHICLES = [
    {
      id: 1,
      name: "Toyota Avanza",
      description:
        "Mobil keluarga untuk menemani perjalanan bersama dengan nyaman.",
      price_per_day: 350000,
      capacity: 7,
      category: "MPV",
      status: "available",
      photo: "assets/images/avanza-racing.jpg",
    },
    {
      id: 2,
      name: "Honda Brio",
      description:
        "Mobil berukuran ringkas untuk kebutuhan perjalanan sehari-hari.",
      price_per_day: 275000,
      capacity: 5,
      category: "Hatchback",
      status: "available",
      photo: "assets/images/brio-racing.jpg",
    },
    {
      id: 3,
      name: "Suzuki Ertiga",
      description:
        "Kendaraan keluarga dengan kapasitas penumpang yang memadai.",
      price_per_day: 325000,
      capacity: 7,
      category: "MPV",
      status: "unavailable",
      photo: "assets/images/ertiga-proper.jpg",
    },
  ];

  const PAYMENT_ACCOUNT = {
    bankName: "BRI",
    accountNumber: "123456789",
    accountHolder: "AJI BASKORO",
  };

  const BOOKING_CODE_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";

  let homeMarkup = "";
  let currentPage = "home";
  let selectedProofFile = null;
  let proofPreviewUrl = null;

  function formatRupiah(amount) {
    return (
      "Rp " +
      new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: 0,
      }).format(amount)
    );
  }

  function escapeHtml(value) {
    return $("<div>")
      .text(String(value ?? ""))
      .html();
  }

  function getVehicleById(id) {
    return DEMO_VEHICLES.find(function (vehicle) {
      return String(vehicle.id) === String(id);
    });
  }

  function getSelectedVehicle() {
    const id = sessionStorage.getItem("selectedVehicleId");

    return getVehicleById(id);
  }

  function getRentalDraft() {
    const draft = sessionStorage.getItem("rentalDraft");

    if (!draft) {
      return null;
    }

    try {
      return JSON.parse(draft);
    } catch (error) {
      sessionStorage.removeItem("rentalDraft");
      return null;
    }
  }

  function saveRentalDraft(draft) {
    sessionStorage.setItem("rentalDraft", JSON.stringify(draft));
  }

  function formatDateTime(date) {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  function toDateTimeInputValue(date) {
    const localDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000,
    );

    return localDate.toISOString().slice(0, 16);
  }

  function getStatusLabel(status) {
    return status === "available" ? "Tersedia" : "Tidak tersedia";
  }

  function renderVehicleCards() {
    const $vehicleList = $("#vehicle-list");

    if (!$vehicleList.length) {
      return;
    }

    $vehicleList.attr("aria-busy", "false");

    if (DEMO_VEHICLES.length === 0) {
      $vehicleList.html(`
                <div class="empty-state">
                <h3>Belum ada mobil yang tersedia.</h3>
                <p>Silakan kembali lagi nanti.</p>
                </div>
                `);

      return;
    }

    const cards = DEMO_VEHICLES.map(function (vehicle) {
      const isAvailable = vehicle.status === "available";

      const statusClass = isAvailable ? "badge-available" : "badge-unavailable";

      return `
        <article class="vehicle-card">
            <div class="vehicle-image">
                <img
                    src="${escapeHtml(vehicle.photo)}"
                    alt="${escapeHtml(vehicle.name)}"
                    width="480"
                    height="360"
                    loading="lazy"
                >
            </div>

            <div class="vehicle-body">
                <div class="vehicle-meta">
                    <span class="vehicle-category">
                        ${escapeHtml(vehicle.category)}
                    </span>

                    <span class="badge ${statusClass}">
                        ${getStatusLabel(vehicle.status)}
                    </span>
                </div>

                <h3 class="vehicle-name">
                    ${escapeHtml(vehicle.name)}
                </h3>

                <p class="vehicle-spec">
                    ${vehicle.capacity} penumpang
                </p>

                <hr class="vehicle-divider">

                <p class="vehicle-price">
                    ${formatRupiah(vehicle.price_per_day)}
                    <span>/ 24 jam</span>
                </p>

                <a
                    href="#detail"
                    class="btn btn-outline btn-sm"
                    data-page="detail"
                    data-vehicle-id="${vehicle.id}"
                >
                    Lihat detail
                </a>
            </div>
        </article>
    `;
    }).join("");

    $vehicleList.html(cards);

    $vehicleList.find(".vehicle-image img").on("error", function () {
      $(this).hide();
    });
  }

  function updateNavigation(page) {
    $(".nav-link").removeClass("is-active").removeAttr("aria-current");

    let activeSelector;

    if (page === "payment") {
      activeSelector = '[data-page="payment"]';
    } else if (page === "detail") {
      activeSelector = '[data-scroll="#vehicles"]';
    } else {
      activeSelector = '[data-scroll="#home"]';
    }

    $(activeSelector)
      .filter(".nav-link")
      .addClass("is-active")
      .attr("aria-current", "page");
  }

  function closeMobileMenu() {
    $("#nav-menu").removeClass("is-open");

    $("#menu-toggle")
      .attr("aria-expanded", "false")
      .attr("aria-label", "Buka Navigasi");
  }

  function showPageLoading() {
    $("#app-content").html(`
            <div class="container">
                <div class="empty-state" role="status">
                    <p>Memuat halaman...</p>
                </div>
            </div>
        `);
  }

  function showPageError(page) {
    $("#app-content").html(`
            <div class="container">
                <div class="empty-state" role="alert">
                    <h2>Halaman gagal dimuat.</h2>
                    <p>Periksa koneksi dan lokasi file halaman.</p>
                    <button
                        type="button"
                        class="btn btn-outline retry-page"
                        data-retry-page="${page}"
                    >
                        Coba lagi
                    </button>
                </div>
            </div>
        `);
  }

  function navigateTo(page, scrollTarget) {
    closeMobileMenu();

    if (page === "home") {
      $("#app-content").html(homeMarkup);

      currentPage = "home";
      renderVehicleCards();
      updateNavigation("home");

      document.title = PAGE_TITLES.home;

      if (scrollTarget) {
        window.setTimeout(function () {
          const target = document.querySelector(scrollTarget);

          if (target) {
            target.scrollIntoView({ behavior: "smooth" });
          }
        }, 0);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      return;
    }

    const pagePath = PAGE_PATHS[page];

    if (!pagePath) {
      return;
    }

    showPageLoading();

    $.ajax({
      url: pagePath,
      method: "GET",
      dataType: "html",
    })
      .done(function (html) {
        $("#app-content").html(html);

        currentPage = page;
        updateNavigation(page);
        document.title = PAGE_TITLES[page];

        if (page === "detail") {
          renderDetailPage();
        }

        if (page === "payment") {
          renderPaymentPage();
        }

        window.scrollTo({ top: 0, behavior: "smooth" });

        $("#app-content")
          .find("h1")
          .first()
          .attr("tabindex", "-1")
          .trigger("focus");
      })
      .fail(function () {
        showPageError(page);
      });
  }

  function renderDetailPage() {
    const vehicle = getSelectedVehicle();

    if (!vehicle) {
      $("#detail-content").prop("hidden", true);
      $("#detail-empty-state").prop("hidden", false);
      return;
    }

    $("#detail-empty-state").prop("hidden", true);
    $("#detail-content").prop("hidden", false);

    $("#detail-category").text(vehicle.category);
    $("#detail-name").text(vehicle.name);
    $("#detail-description").text(vehicle.description);
    $("#detail-capacity").text(vehicle.capacity + " penumpang");
    $("#detail-status").text(getStatusLabel(vehicle.status));
    $("#detail-price").text(formatRupiah(vehicle.price_per_day));

    $("#breadcrumb-category").text(vehicle.category);
    $("#breadcrumb-vehicle-name").text(vehicle.name);

    $("#spec-category").text(vehicle.category);
    $("#spec-status").text(getStatusLabel(vehicle.status));
    $("#spec-price").text(formatRupiah(vehicle.price_per_day));

    $("#detail-image").attr("src", vehicle.photo).attr("alt", vehicle.name);

    const available = vehicle.status === "available";
    $("#detail-status").attr(
      "class",
      "badge " + (available ? "badge-available" : "badge-unavailable"),
    );

    $("#check-availability, #continue-payment").prop("disabled", !available);

    $("#detail-unavailable-message").prop("hidden", available);

    const startDate = new Date();
    startDate.setMinutes(0, 0, 0);
    startDate.setHours(startDate.getHours() + 1);

    $("#rental-start")
      .attr("min", toDateTimeInputValue(new Date()))
      .val(toDateTimeInputValue(startDate));

    $("#rental-duration").val(1);

    updateRentalEstimate();
  }

  function updateRentalEstimate() {
    const vehicle = getSelectedVehicle();

    if (!vehicle) {
      return;
    }

    const startValue = $("#rental-start").val();
    const duration = Number($("#rental-duration").val());

    if (!startValue || duration < 1 || duration > 30) {
      $("#rental-end").val("");
      $("#rental-total").text("—");
      return;
    }

    const start = new Date(startValue);

    if (Number.isNaN(start.getTime())) {
      return;
    }

    const end = new Date(start.getTime() + duration * 24 * 60 * 60 * 1000);

    $("#rental-end").val(toDateTimeInputValue(end));
    $("#rental-days").text(duration + " hari");
    $("#rental-rate").text(formatRupiah(vehicle.price_per_day));
    $("#rental-total").text(formatRupiah(vehicle.price_per_day * duration));

    $("#availability-message").empty().removeClass("is-success is-error");
  }

  function getValidatedRental() {
    const vehicle = getSelectedVehicle();
    const startValue = $("#rental-start").val();
    const duration = Number($("#rental-duration").val());
    const start = new Date(startValue);

    if (!vehicle || !startValue || Number.isNaN(start.getTime())) {
      $("#availability-message")
        .attr("role", "alert")
        .addClass("is-error")
        .text("Silakan isi waktu mulai sewa.");

      $("#rental-start").trigger("focus");
      return null;
    }

    if (start < new Date()) {
      $("#availability-message")
        .attr("role", "alert")
        .addClass("is-error")
        .text("Waktu mulai tidak boleh berada di masa lalu.");

      $("#rental-start").trigger("focus");
      return null;
    }

    if (!Number.isInteger(duration) || duration < 1 || duration > 30) {
      $("#availability-message")
        .attr("role", "alert")
        .addClass("is-error")
        .text("Durasi sewa harus antara 1 sampai 30 hari.");

      $("#rental-duration").trigger("focus");
      return null;
    }

    const end = new Date(start.getTime() + duration * 24 * 60 * 60 * 1000);

    return {
      vehicleId: vehicle.id,
      start: start.toISOString(),
      end: end.toISOString(),
      days: duration,
      total: vehicle.price_per_day * duration,
    };
  }

  function checkAvailability() {
    const vehicle = getSelectedVehicle();
    const rental = getValidatedRental();

    if (!vehicle || !rental) {
      return;
    }

    if (vehicle.status !== "available") {
      $("#availability-message")
        .removeClass("is-success")
        .addClass("is-error")
        .text("Mobil ini sedang tidak dapat dipesan.");

      return;
    }

    // TODO: ganti dengan request ke API pengecekan jadwal.
    $("#availability-message")
      .removeClass("is-error")
      .addClass("is-success")
      .text(
        "Status armada tercatat tersedia. " +
          "Pengecekan benturan jadwal belum terhubung ke server.",
      );
  }

  function renderPaymentPage() {
    clearProofPreview();

    $("#payment-form-layout").prop("hidden", true);
    $("#payment-empty-state").prop("hidden", true);
    $("#payment-success").prop("hidden", true);

    const draft = getRentalDraft();

    if (!draft) {
      $("#payment-empty-state").prop("hidden", false);
      return;
    }

    const vehicle = getVehicleById(draft.vehicleId);

    if (!vehicle) {
      $("#payment-empty-state").prop("hidden", false);
      return;
    }

    $("#payment-form-layout").prop("hidden", false);

    $("#summary-vehicle-name").text(vehicle.name);
    $("#summary-category").text(vehicle.category);
    $("#summary-start").text(formatDateTime(new Date(draft.start)));
    $("#summary-end").text(formatDateTime(new Date(draft.end)));
    $("#summary-duration").text(draft.days + " hari");
    $("#summary-rate").text(formatRupiah(vehicle.price_per_day));
    $("#summary-total").text(formatRupiah(draft.total));

    $("#summary-vehicle-image")
      .attr("src", vehicle.photo)
      .attr("alt", vehicle.name);

    $("#payment-amount").text(formatRupiah(draft.total));

    $("#payment-bank-name").text(
      PAYMENT_ACCOUNT.bankName || "Belum dikonfigurasi",
    );

    $("#payment-account-number").text(
      PAYMENT_ACCOUNT.accountNumber || "Belum dikonfigurasi",
    );

    $("#payment-account-holder").text(
      PAYMENT_ACCOUNT.accountHolder || "Belum dikonfigurasi",
    );

    $("#copy-account")
      .prop("disabled", !PAYMENT_ACCOUNT.accountNumber)
      .attr("data-copy-value", PAYMENT_ACCOUNT.accountNumber);
  }

  function clearFieldError(inputSelector, errorSelector) {
    $(inputSelector).removeAttr("aria-invalid");
    $(errorSelector).prop("hidden", true).text("");
  }

  function showFieldError(inputSelector, errorSelector, message) {
    $(inputSelector).attr("aria-invalid", "true");
    $(errorSelector).prop("hidden", false).text(message);
  }

  function validatePaymentForm() {
    let firstInvalid = null;
    const name = $("#customer-name").val().trim();
    const phone = $("#customer-phone").val().trim();
    const email = $("#customer-email").val().trim();
    const phoneDigits = phone.replace(/\D/g, "");

    clearFieldError("#customer-name", "#name-error");
    clearFieldError("#customer-phone", "#phone-error");
    clearFieldError("#customer-email", "#email-error");
    $("#proof-error").prop("hidden", true).text("");
    $("#agreement-error").prop("hidden", true).text("");

    if (!name) {
      showFieldError(
        "#customer-name",
        "#name-error",
        "Nama lengkap wajib diisi.",
      );
      firstInvalid = firstInvalid || "#customer-name";
    }

    if (!/^\d{9,13}$/.test(phoneDigits)) {
      showFieldError(
        "#customer-phone",
        "#phone-error",
        "Masukkan nomor telepon yang valid, contoh 81234567890.",
      );
      firstInvalid = firstInvalid || "#customer-phone";
    }

    const emailInput = document.querySelector("#customer-email");

    if (!email || !emailInput.checkValidity()) {
      showFieldError(
        "#customer-email",
        "#email-error",
        "Format email belum benar, contoh nama@email.com.",
      );
      firstInvalid = firstInvalid || "#customer-email";
    }

    if (!selectedProofFile) {
      $("#proof-error")
        .prop("hidden", false)
        .text("Unggah bukti pembayaran terlebih dahulu.");

      firstInvalid = firstInvalid || "#proof-dropzone";
    }

    if (!$("#payment-agreement").is(":checked")) {
      $("#agreement-error")
        .prop("hidden", false)
        .text("Anda perlu menyetujui ketentuan sebelum mengirim.");

      firstInvalid = firstInvalid || "#payment-agreement";
    }

    if (firstInvalid) {
      $(firstInvalid).trigger("focus");
      return false;
    }

    return true;
  }

  function createBookingCode() {
    let code = "";

    for (let index = 0; index < 8; index += 1) {
      const randomIndex = Math.floor(
        Math.random() * BOOKING_CODE_CHARACTERS.length,
      );

      code += BOOKING_CODE_CHARACTERS[randomIndex];
    }

    return code;
  }

  function showPaymentSuccess() {
    const code = createBookingCode();

    $("#payment-form-layout").prop("hidden", true);

    $("#payment-success")
      .html(
        `
            <div class="success-panel" role="status">
                <div class="success-icon" aria-hidden="true">✓</div>

                <h2 tabindex="-1">Simulasi pembayaran selesai</h2>

                <p>
                    Kode booking simulasi Anda:
                </p>

                <div class="booking-code" id="booking-code">
                    ${code}
                </div>

                <button
                    type="button"
                    class="btn btn-outline"
                    id="copy-booking-code"
                >
                    Salin kode
                </button>

                <p class="form-help">
                    Ini hanya simulasi frontend. Bukti pembayaran dan
                    data penyewa belum dikirim ke server.
                </p>

                <a
                    href="#home"
                    class="btn btn-primary"
                    data-page="home"
                    data-scroll="#home"
                >
                    Kembali ke beranda
                </a>
            </div>
        `,
      )
      .prop("hidden", false);

    $("#payment-success h2").trigger("focus");
  }

  function clearProofPreview() {
    if (proofPreviewUrl) {
      URL.revokeObjectURL(proofPreviewUrl);
      proofPreviewUrl = null;
    }

    selectedProofFile = null;

    $("#proof-file").val("");
    $("#proof-preview").prop("hidden", true);
    $("#proof-dropzone").prop("hidden", false);
  }

  function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) {
      return Math.round(bytes / 1024) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function handleProofFile(file) {
    if (!file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png"];
    const maxSize = 10 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      $("#proof-error")
        .prop("hidden", false)
        .text("Format file harus JPG atau PNG.");
      return;
    }

    if (file.size > maxSize) {
      $("#proof-error")
        .prop("hidden", false)
        .text("Ukuran file melebihi 10 MB.");
      return;
    }

    clearProofPreview();

    selectedProofFile = file;
    proofPreviewUrl = URL.createObjectURL(file);

    $("#proof-preview-image").attr("src", proofPreviewUrl);
    $("#proof-file-name").text(file.name);
    $("#proof-file-size").text(formatFileSize(file.size));
    $("#proof-preview").prop("hidden", false);
    $("#proof-dropzone").prop("hidden", true);
    $("#proof-error").prop("hidden", true).text("");
  }

  $(function () {
    homeMarkup = $("#app-content").html();

    renderVehicleCards();

    $("#menu-toggle").on("click", function () {
      const isOpen = $(this).attr("aria-expanded") === "true";

      $(this)
        .attr("aria-expanded", String(!isOpen))
        .attr("aria-label", isOpen ? "Buka Navigasi" : "Tutup Navigasi");

      $("#nav-menu").toggleClass("is-open", !isOpen);
    });

    $(document).on("click", function (event) {
      const clickedInsideNavbar = $(event.target).closest(".navbar").length > 0;

      if (!clickedInsideNavbar) {
        closeMobileMenu();
      }
    });

    $(document).on("keydown", function (event) {
      if (event.key === "Escape") {
        closeMobileMenu();
      }
    });

    const $siteHeader = $(".site-header");

    function updateHeaderOnScroll() {
      $siteHeader.toggleClass("is-scrolled", window.scrollY > 8);
    }

    $(window).on("scroll", updateHeaderOnScroll);
    updateHeaderOnScroll();

    $(document).on("click", "a[data-page]", function (event) {
      event.preventDefault();

      const page = $(this).data("page");
      const vehicleId = $(this).data("vehicle-id");
      const scrollTarget = $(this).data("scroll");

      if (vehicleId !== undefined) {
        sessionStorage.setItem("selectedVehicleId", String(vehicleId));

        sessionStorage.removeItem("rentalDraft");
      }

      navigateTo(page, scrollTarget);
    });

    $(document).on("click", ".retry-page", function () {
      navigateTo($(this).data("retry-page"));
    });

    $(document).on(
      "input change",
      "#rental-start, #rental-duration",
      updateRentalEstimate,
    );

    $(document).on("click", "#check-availability", function () {
      checkAvailability();
    });

    $(document).on("click", "#continue-payment", function () {
      const vehicle = getSelectedVehicle();
      const rental = getValidatedRental();

      if (!vehicle || !rental) {
        return;
      }

      if (vehicle.status !== "available") {
        return;
      }

      saveRentalDraft(rental);
      navigateTo("payment");
    });

    $(document).on("submit", "#payment-form", function (event) {
      event.preventDefault();

      if (!validatePaymentForm()) {
        return;
      }

      showPaymentSuccess();
    });

    $(document).on("change", "#proof-file", function () {
      handleProofFile(this.files[0]);
    });

    $(document).on("click", "#remove-proof", function () {
      clearProofPreview();
      $("#proof-error").prop("hidden", true).text("");
    });

    $(document).on("dragover", "#proof-dropzone", function (event) {
      event.preventDefault();
      $(this).addClass("is-dragover");
    });

    $(document).on("dragleave", "#proof-dropzone", function () {
      $(this).removeClass("is-dragover");
    });

    $(document).on("drop", "#proof-dropzone", function (event) {
      event.preventDefault();
      $(this).removeClass("is-dragover");

      const files = event.originalEvent.dataTransfer.files;

      if (files.length > 0) {
        handleProofFile(files[0]);
      }
    });

    $(document).on("click", "#copy-account", function () {
      const accountNumber = $(this).attr("data-copy-value");

      if (!accountNumber) {
        return;
      }

      navigator.clipboard.writeText(accountNumber).then(function () {
        $("#copy-account-message").text("Nomor rekening berhasil disalin.");
      });
    });

    $(document).on("click", "#copy-booking-code", function () {
      const $button = $(this);
      const code = $("#booking-code").text().trim();

      navigator.clipboard.writeText(code).then(() => {
        $button.text("Kode tersalin");
      });
    });
  });
})(jQuery);
