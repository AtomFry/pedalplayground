var pedalImagePath = "public/images/pedals/";
var pedalboardImagePath = "public/images/pedalboards/";

const UNITS_IN = 'in.';
const UNITS_MM = 'mm.';

// API Service for communicating with the REST API
window.APIService = {
	baseURL: 'http://localhost:3001/api',
	cache: {
		pedals: null,
		pedalboards: null,
		timestamp: null
	},
	cacheTimeout: 300000, // 5 minutes
	
	checkHealth: function(callback, errorCallback) {
		$.ajax({
			url: this.baseURL + '/health',
			timeout: 5000,
			dataType: 'json',
			success: function(data) {
				console.log('API Health Check: OK');
				callback(data);
			},
			error: function(xhr, status, error) {
				console.error('API Health Check: Failed', error);
				errorCallback(xhr, status, error);
			}
		});
	},
	
	getPedals: function(successCallback, errorCallback) {
		var self = this;
		
		// Check cache first
		if (this.isCacheValid('pedals')) {
			console.log('Using cached pedals data');
			successCallback(this.cache.pedals);
			return;
		}
		
		console.log('Fetching pedals from API...');
		this.fetchAllPedals(1, [], successCallback, errorCallback);
	},
	
	fetchAllPedals: function(page, allPedals, successCallback, errorCallback) {
		var self = this;
		
		$.ajax({
			url: this.baseURL + '/pedals?page=' + page + '&limit=1000&sort=brand&order=asc',
			timeout: 10000,
			dataType: 'json',
			success: function(data) {
				// Add pedals from this page to our collection
				allPedals = allPedals.concat(data.data);
				
				console.log('Pedals page ' + page + ' loaded: ' + data.data.length + ' pedals (total so far: ' + allPedals.length + ')');
				
				// Check if there are more pages
				if (data.pagination && data.pagination.hasNextPage) {
					// Fetch the next page
					self.fetchAllPedals(page + 1, allPedals, successCallback, errorCallback);
				} else {
					// All pages loaded, return complete dataset
					console.log('All pedals loaded! Total: ' + allPedals.length + ' pedals');
					var completeData = {
						data: allPedals,
						pagination: {
							total: allPedals.length,
							totalPages: page,
							page: 1,
							limit: allPedals.length
						}
					};
					
					self.cache.pedals = completeData;
					self.cache.timestamp = Date.now();
					successCallback(completeData);
				}
			},
			error: function(xhr, status, error) {
				console.error('Pedals API call failed on page ' + page + ':', error);
				errorCallback(xhr, status, error);
			}
		});
	},
	
	getPedalboards: function(successCallback, errorCallback) {
		var self = this;
		
		// Check cache first
		if (this.isCacheValid('pedalboards')) {
			console.log('Using cached pedalboards data');
			successCallback(this.cache.pedalboards);
			return;
		}
		
		console.log('Fetching pedalboards from API...');
		this.fetchAllPedalboards(1, [], successCallback, errorCallback);
	},
	
	fetchAllPedalboards: function(page, allBoards, successCallback, errorCallback) {
		var self = this;
		
		$.ajax({
			url: this.baseURL + '/pedalboards?page=' + page + '&limit=1000&sort=brand&order=asc',
			timeout: 10000,
			dataType: 'json',
			success: function(data) {
				// Add pedalboards from this page to our collection
				allBoards = allBoards.concat(data.data);
				
				console.log('Pedalboards page ' + page + ' loaded: ' + data.data.length + ' pedalboards (total so far: ' + allBoards.length + ')');
				
				// Check if there are more pages
				if (data.pagination && data.pagination.hasNextPage) {
					// Fetch the next page
					self.fetchAllPedalboards(page + 1, allBoards, successCallback, errorCallback);
				} else {
					// All pages loaded, return complete dataset
					console.log('All pedalboards loaded! Total: ' + allBoards.length + ' pedalboards');
					var completeData = {
						data: allBoards,
						pagination: {
							total: allBoards.length,
							totalPages: page,
							page: 1,
							limit: allBoards.length
						}
					};
					
					self.cache.pedalboards = completeData;
					self.cache.timestamp = Date.now();
					successCallback(completeData);
				}
			},
			error: function(xhr, status, error) {
				console.error('Pedalboards API call failed on page ' + page + ':', error);
				errorCallback(xhr, status, error);
			}
		});
	},
	
	isCacheValid: function(type) {
		return this.cache[type] && 
			   this.cache.timestamp && 
			   (Date.now() - this.cache.timestamp) < this.cacheTimeout;
	},
	
	clearCache: function() {
		this.cache.pedals = null;
		this.cache.pedalboards = null;
		this.cache.timestamp = null;
		console.log('API cache cleared');
	}
};

// Authentication Manager for handling user login/logout and session management
window.AuthManager = {
	currentUser: null,
	
	init: function() {
		this.bindEvents();
		this.checkAuthStatus();
	},
	
	bindEvents: function() {
		// Modal event handlers
		$('#loginLink').click(this.showLoginModal.bind(this));
		$('#loginSubmit').click(this.handleLogin.bind(this));
		$('#registerSubmit').click(this.handleRegister.bind(this));
		$('#logoutLink').click(this.handleLogout.bind(this));
		$('#showRegister').click(this.showRegisterModal.bind(this));
		$('#showLogin').click(this.showLoginModal.bind(this));
		$('#showReset').click(this.showResetModal.bind(this));
		$('#backToLogin').click(this.showLoginModal.bind(this));
		$('#resetSubmit').click(this.handlePasswordReset.bind(this));
		
		// Form submission handlers
		$('#loginForm').submit(this.handleLogin.bind(this));
		$('#registerForm').submit(this.handleRegister.bind(this));
		$('#resetForm').submit(this.handlePasswordReset.bind(this));
		
		// Clear errors when modals are shown
		$('#loginModal').on('show.bs.modal', function() {
			$('#loginError').hide();
			$('#loginForm')[0].reset();
		});
		
		$('#registerModal').on('show.bs.modal', function() {
			$('#registerError').hide();
			$('#registerForm')[0].reset();
		});
		
		$('#resetModal').on('show.bs.modal', function() {
			$('#resetError, #resetSuccess').hide();
			$('#resetForm')[0].reset();
		});
	},
	
	checkAuthStatus: function() {
		var self = this;
		$.ajax({
			url: APIService.baseURL + '/auth/status',
			method: 'GET',
			success: function(response) {
				if (response.success && response.authenticated) {
					self.setAuthenticatedState(response.user);
				} else {
					self.setGuestState();
				}
			},
			error: function() {
				self.setGuestState();
			}
		});
	},
	
	handleLogin: function(e) {
		e.preventDefault();
		var self = this;
		var email = $('#loginEmail').val().trim();
		var password = $('#loginPassword').val();
		
		if (!email || !password) {
			this.showError('#loginError', 'Please enter both email and password');
			return;
		}
		
		this.setLoading('#loginSubmit', '.login-spinner', '.login-text', 'Logging in...');
		
		$.ajax({
			url: APIService.baseURL + '/auth/login',
			method: 'POST',
			data: JSON.stringify({ email: email, password: password }),
			contentType: 'application/json',
			success: function(response) {
				self.clearLoading('#loginSubmit', '.login-spinner', '.login-text', 'Login');
				
				if (response.success) {
					self.setAuthenticatedState(response.user);
					$('#loginModal').modal('hide');
					self.syncLocalData();
				} else {
					self.showError('#loginError', response.error || 'Login failed');
				}
			},
			error: function(xhr) {
				self.clearLoading('#loginSubmit', '.login-spinner', '.login-text', 'Login');
				var errorMsg = 'Login failed. Please try again.';
				
				if (xhr.responseJSON && xhr.responseJSON.error) {
					errorMsg = xhr.responseJSON.error;
				}
				
				self.showError('#loginError', errorMsg);
			}
		});
	},
	
	handleRegister: function(e) {
		e.preventDefault();
		var self = this;
		var email = $('#registerEmail').val().trim();
		var password = $('#registerPassword').val();
		var confirmPassword = $('#confirmPassword').val();
		
		if (!email || !password || !confirmPassword) {
			this.showError('#registerError', 'Please fill in all fields');
			return;
		}
		
		if (password !== confirmPassword) {
			this.showError('#registerError', 'Passwords do not match');
			return;
		}
		
		if (password.length < 4) {
			this.showError('#registerError', 'Password must be at least 4 characters long');
			return;
		}
		
		this.setLoading('#registerSubmit', '.register-spinner', '.register-text', 'Creating...');
		
		$.ajax({
			url: APIService.baseURL + '/auth/register',
			method: 'POST',
			data: JSON.stringify({ email: email, password: password }),
			contentType: 'application/json',
			success: function(response) {
				self.clearLoading('#registerSubmit', '.register-spinner', '.register-text', 'Create Account');
				
				if (response.success) {
					self.setAuthenticatedState(response.user);
					$('#registerModal').modal('hide');
				} else {
					self.showError('#registerError', response.error || 'Registration failed');
				}
			},
			error: function(xhr) {
				self.clearLoading('#registerSubmit', '.register-spinner', '.register-text', 'Create Account');
				var errorMsg = 'Registration failed. Please try again.';
				
				if (xhr.responseJSON && xhr.responseJSON.error) {
					errorMsg = xhr.responseJSON.error;
				}
				
				self.showError('#registerError', errorMsg);
			}
		});
	},
	
	handleLogout: function(e) {
		e.preventDefault();
		var self = this;
		
		$.ajax({
			url: APIService.baseURL + '/auth/logout',
			method: 'POST',
			success: function() {
				self.setGuestState();
			},
			error: function() {
				// Even if logout fails, clear local state
				self.setGuestState();
			}
		});
	},
	
	handlePasswordReset: function(e) {
		e.preventDefault();
		var self = this;
		var email = $('#resetEmail').val().trim();
		
		if (!email) {
			this.showError('#resetError', 'Please enter your email address');
			return;
		}
		
		this.setLoading('#resetSubmit', '.reset-spinner', '.reset-text', 'Sending...');
		
		$.ajax({
			url: APIService.baseURL + '/auth/reset-request',
			method: 'POST',
			data: JSON.stringify({ email: email }),
			contentType: 'application/json',
			success: function(response) {
				self.clearLoading('#resetSubmit', '.reset-spinner', '.reset-text', 'Send Reset Link');
				
				if (response.success) {
					$('#resetError').hide();
					$('#resetSuccess').text('Password reset link sent to your email').show();
				} else {
					self.showError('#resetError', response.error || 'Reset failed');
				}
			},
			error: function(xhr) {
				self.clearLoading('#resetSubmit', '.reset-spinner', '.reset-text', 'Send Reset Link');
				var errorMsg = 'Failed to send reset email. Please try again.';
				
				if (xhr.responseJSON && xhr.responseJSON.error) {
					errorMsg = xhr.responseJSON.error;
				}
				
				self.showError('#resetError', errorMsg);
			}
		});
	},
	
	setAuthenticatedState: function(user) {
		this.currentUser = user;
		$('#userEmail').text(user.email);
		$('#userNav').show();
		$('#guestNav').hide();
		console.log('User authenticated:', user.email);
	},
	
	setGuestState: function() {
		this.currentUser = null;
		$('#userNav').hide();
		$('#guestNav').show();
		console.log('User logged out');
	},
	
	showLoginModal: function(e) {
		if (e) e.preventDefault();
		$('#registerModal, #resetModal').modal('hide');
		$('#loginModal').modal('show');
	},
	
	showRegisterModal: function(e) {
		if (e) e.preventDefault();
		$('#loginModal, #resetModal').modal('hide');
		$('#registerModal').modal('show');
	},
	
	showResetModal: function(e) {
		if (e) e.preventDefault();
		$('#loginModal, #registerModal').modal('hide');
		$('#resetModal').modal('show');
	},
	
	showError: function(selector, message) {
		$(selector).text(message).show();
	},
	
	setLoading: function(buttonSelector, spinnerSelector, textSelector, loadingText) {
		$(buttonSelector).prop('disabled', true);
		$(buttonSelector + ' ' + spinnerSelector).show();
		$(buttonSelector + ' ' + textSelector).text(loadingText);
	},
	
	clearLoading: function(buttonSelector, spinnerSelector, textSelector, originalText) {
		$(buttonSelector).prop('disabled', false);
		$(buttonSelector + ' ' + spinnerSelector).hide();
		$(buttonSelector + ' ' + textSelector).text(originalText);
	},
	
	syncLocalData: function() {
		// TODO: Sync any local favorites/layouts to server
		// This will be implemented in Phase 2 and 3
		console.log('Syncing local data (placeholder)');
	},
	
	isAuthenticated: function() {
		return this.currentUser !== null;
	},
	
	getCurrentUser: function() {
		return this.currentUser;
	}
};

// UI Helper Functions for loading states and error handling
function showLoadingMessage(message) {
	$('.pedal-list, .pedalboard-list').prop('disabled', true);
	$('.pedal-list, .pedalboard-list').append('<option value="">Loading...</option>');
	console.log('Loading: ' + message);
}

function hideLoadingMessage() {
	$('.pedal-list, .pedalboard-list').prop('disabled', false);
	$('.pedal-list option[value=""], .pedalboard-list option[value=""]').remove();
}

function showErrorMessage(message) {
	hideLoadingMessage();
	alert('Error: ' + message);
	console.error('API Error: ' + message);
}

$(document).ready(function () {
	// Initialize Authentication Manager
	AuthManager.init();
	
	// Check API health before loading data
	APIService.checkHealth(
		function() {
			// API is healthy, proceed with normal loading
			console.log('API health check passed - loading data');
			GetPedalData();
			GetPedalBoardData();
		},
		function() {
			showErrorMessage('API server is not available. Please ensure the server is running on http://localhost:3001');
		}
	);

	// Make lists searchable
	$(".pedal-list").select2({
		placeholder: "Select a pedal",
		width: "style",
	});

	$(".pedal-list").on("select2:select", function (e) {
		$("#add-selected-pedal").click();
		$(this).trigger("change").focus();
		//$(this).val(null).trigger('change').focus();
	});

	$(".pedalboard-list").select2({
		placeholder: "Select a pedalboard",
		width: "style",
	});

	$(".pedalboard-list").on("select2:select", function (e) {
		$("#add-selected-pedalboard").click();
		$(this).trigger("change").focus();
		//$(this).val(null).trigger('change').focus();
	});

	$(function () {
		$("#input-unit-pb").switchButton({
			checked: true,
			on_label: UNITS_IN,
			off_label: UNITS_MM,
			width: 50,
			height: 12,
			button_width: 35,
		})

		$("#input-unit-pd").switchButton({
			checked: true,
			on_label: UNITS_IN,
			off_label: UNITS_MM,
			width: 50,
			height: 12,
			button_width: 35,
		})

		// Load canvas from localStorage if it has been saved prior
		if (localStorage["pedalCanvas"] != null) {
			var savedPedalCanvas = JSON.parse(localStorage["pedalCanvas"]);
			$(".canvas").html(savedPedalCanvas);
			readyCanvas();
		}

		// If hidden multiplier value doesn't exist, create it
		if ($("#multiplier").length == 0) {
			$(".canvas").append('<input id="multiplier" type="hidden" value="25">');
			var multiplier = 25;
			// If hidden multiplier value does exist set variable
		} else {
			var multiplier = $("#multiplier").val();
		}
		// Set canvas scale input and bg size to match scale
		$("#canvas-scale").val(multiplier);
		$(".canvas").css("background-size", multiplier + "px");
	});

	// When user changes scale, update stuffs
	$("#canvas-scale").change(function () {
		// update var
		var multiplier = $(this).val();
		$("#multiplier").val(multiplier);

		// Update scale of bg image
		$(".canvas").css("background-size", multiplier + "px");

		// Update all items with stored scale
		$(".item").each(function () {
			$(this).attr("data-scale", multiplier);
		});

		// Update regular Pedals
		$(".pedalboard").each(function () {
			var scaledWidth = $(this).data("width") * multiplier;
			var scaledHeight = $(this).data("height") * multiplier;
			$(this).find(".artwork").css("width", scaledWidth).css("height", scaledHeight);
		});

		// Update regular Pedals
		$(".pedal, .pedalboard").each(function () {
			var scaledWidth = $(this).data("width") * multiplier;
			var scaledHeight = $(this).data("height") * multiplier;
			$(this).find(".artwork").css("width", scaledWidth).css("height", scaledHeight);
		});

		// Update custom pedals
		$(".pedal--custom, .pedalboard--custom").each(function () {
			var scaledWidth = $(this).data("width") * multiplier;
			var scaledHeight = $(this).data("height") * multiplier;
			$(this).css("width", scaledWidth).css("height", scaledHeight);
		});
		$(".pedalboard--custom").each(function () {
			var scaledWidth = $(this).data("width") * multiplier;
			var scaledHeight = $(this).data("height") * multiplier;
			$(this).css({
				width: scaledWidth,
				height: scaledHeight,
				borderWidth: multiplier * 0.5,
			});
		});

		savePedalCanvas();
	});

	$("body").on("click", ".sidebar-open", function (e) {
		$(".site-body").addClass("is-slid");
		e.preventDefault();
	});

	$("body").on("click", ".sidebar-close", function (e) {
		$(".site-body").removeClass("is-slid");
		e.preventDefault();
	});

	$("body").on("click", "#clear-canvas-confirmation", function () {
		$(".canvas").empty();
		$("#clear-canvas-modal").modal("hide");
		savePedalCanvas();
	});

	$("body").on("click", "#add-pedal button", function (event) {
		var multiplier = $("#canvas-scale").val();
		var serial = GenRandom.Job();
		var selected = $("#add-pedal").find(":selected");
		var name = $(selected).text();
		var shortname = $(selected).attr("id");
		var width = $(selected).data("width");
		var height = $(selected).data("height");
		var scaledWidth = $(selected).data("width") * multiplier;
		var scaledHeight = $(selected).data("height") * multiplier;
		var i = $(selected).data("image");
		var pedal =
			'\
<div id="item-' +
			serial +
			'" class="item pedal ' +
			shortname +
			'" title="' +
			name +
			'" data-width="' +
			width +
			'" data-height="' +
			height +
			'" data-scale="' +
			multiplier +
			'">\
	<div class="artwork" style="width:' +
			scaledWidth +
			"px;height:" +
			scaledHeight +
			"px; background-image:url(" +
			pedalImagePath +
			i +
			')"></div>\
	<div class="shadow"></div>\
	<div class="actions">\
		<a class="rotate"></a>\
		<a class="delete"></a>\
	</div>\
</div>';
		$(".canvas").append(pedal);
		readyCanvas();
		ga("send", "event", "Pedal", "added", name);
		event.preventDefault();
	});

	$("body").on("click", "#add-pedalboard button", function (event) {
		var serial = GenRandom.Job();
		var multiplier = $("#canvas-scale").val();
		var selected = $("#add-pedalboard").find(":selected");
		var name = $(selected).text();
		var shortname = $(selected).attr("id");
		var width = $(selected).data("width");
		var height = $(selected).data("height");
		var scaledWidth = $(selected).data("width") * multiplier;
		var scaledHeight = $(selected).data("height") * multiplier;
		var i = $(selected).data("image");
		var pedal =
			'\
<div id="item-' +
			serial +
			'" class="item pedalboard ' +
			shortname +
			'" title="' +
			name +
			'" data-width="' +
			width +
			'" data-height="' +
			height +
			'" data-scale="' +
			multiplier +
			'">\
	<div class="artwork" style="width:' +
			scaledWidth +
			"px;height:" +
			scaledHeight +
			"px; background-image:url(" +
			pedalboardImagePath +
			i +
			')"></div>\
	<div class="actions">\
		<a class="rotate"></a>\
		<a class="delete"></a>\
	</div>\
</div>';

		$(".canvas").prepend(pedal);
		readyCanvas();
		ga("send", "event", "Pedalboard", "added", name);
		event.preventDefault();
	});

	// Activate color picker plugin on custom color field
	$(".custom-color-block").colorpicker({
		color: "#41C74D",
	});

	// Add custom pedal
	$("body").on("click", "#add-custom-pedal .btn", function (event) {
		var serial = GenRandom.Job();
		var multiplier = $("#canvas-scale").val();
		var width = convertUnitsIfNeeded('pd', $("#add-custom-pedal .custom-width").val());
		var height = convertUnitsIfNeeded('pd', $("#add-custom-pedal .custom-height").val());
		var scaledWidth = width * multiplier;
		var scaledHeight = height * multiplier;
		var dims = width + '" x ' + height + '"';
		var name = $("#add-custom-pedal .custom-name").val();
		var image = $("#add-custom-pedal .custom-color").val();
		var pedal =
			'\
<div id="item-' +
			serial +
			'" class="item pedal pedal--custom" style="width:' +
			scaledWidth +
			"px;height:" +
			scaledHeight +
			'px;" title="' +
			name +
			'" data-width="' +
			width +
			'" data-height="' +
			height +
			'" data-scale="' +
			multiplier +
			'">\
	<span class="pedal__box" style="background-color:' +
			image +
			';"></span>\
	<span class="pedal__name">' +
			name +
			'</span>\
	<span class="pedal__jack1"></span>\
	<span class="pedal__jack2"></span>\
	<span class="pedal__knob1"></span>\
	<span class="pedal__knob2"></span>\
	<span class="pedal__led"></span>\
	<span class="pedal__switch"></span>\
	<div class="actions">\
		<a class="rotate"></a>\
		<a class="delete"></a>\
	</div>\
</div>';

		$("#add-custom-pedal .invalid").removeClass("invalid");

		if (width == "" || height == "") {
			$("#add-custom-pedal .custom-height, #add-custom-pedal .custom-width").addClass(
				"invalid"
			);
			$("#add-custom-pedal .custom-width").focus();
		} else if (width == "") {
			$("#add-custom-pedal .custom-width").addClass("invalid").focus();
		} else if (height == "") {
			$("#add-custom-pedal .custom-height").addClass("invalid").focus();
		} else {
			console.log("add custom pedal...");
			$(".canvas").append(pedal);
			readyCanvas();
			// console.log(dims);
			ga("send", "event", "CustomPedal", "added", dims + " " + name);
			event.preventDefault();
		}
	});

	// Add custom pedalboard
	$("body").on("click", "#add-custom-pedalboard .btn", function (event) {
		var serial = GenRandom.Job();
		var multiplier = $("#canvas-scale").val();
		var width = convertUnitsIfNeeded('pb', $("#add-custom-pedalboard .custom-width").val());
		var height = convertUnitsIfNeeded('pb',$("#add-custom-pedalboard .custom-height").val());
		var scaledWidth = width * multiplier;
		var scaledHeight = height * multiplier;

		$("#add-custom-pedalboard .invalid").removeClass("invalid");

		if (width == "" || height == "") {
			$(
				"#add-custom-pedalboard .custom-height, #add-custom-pedalboard .custom-width"
			).addClass("invalid");
			$("#add-custom-pedalboard .custom-width").focus();
		} else if (width == "") {
			$("#add-custom-pedalboard .custom-width").addClass("invalid").focus();
		} else if (height == "") {
			$("#add-custom-pedalboard .custom-height").addClass("invalid").focus();
		} else {
			console.log("add custom pedalboard...");
			var dims = width + '" x ' + height + '"';
			var pedalboard =
				'<div id="item-' +
				serial +
				'" class="item pedalboard pedalboard--custom" style="width:' +
				scaledWidth +
				"px;height:" +
				scaledHeight +
				"px; border-width:" +
				multiplier / 2 +
				'px" title="Custom Pedalboard" data-width="' +
				width +
				'" data-height="' +
				height +
				'" data-scale="' +
				multiplier +
				'">\
			<div class="actions">\
			<a class="delete"></a>\
			<a class="rotate"></a>\
			</div>\
			</div>';

			$(".canvas").prepend(pedalboard);
			readyCanvas();
			ga("send", "event", "CustomPedalboard", "added", dims + " " + name);
			event.preventDefault();
		}
	});

	// On keydown of "D" or "delete" remove pedal
	$("body").on("keydown keyup", function (event) {
		if (event.which == 68 || event.which == 8) {
			deleteSelected();
			$(".site-body > .panel").remove();
			savePedalCanvas();
		}
	});

	// On keydown of "[", move pedal back
	$("body").on("keydown keyup", function (event) {
		if (event.which == 219) {
			$(".panel a[href='#back']").click();
			savePedalCanvas();
		}
	});

	// On keydown of "]", move pedal front
	$("body").on("keydown keyup", function (event) {
		if (event.which == 221) {
			$(".panel a[href='#front']").click();
			savePedalCanvas();
		}
	});

	// 37 - left
	// 38 - up
	// 39 - right
	// 40 - down

	// Move left
	$("body").on("keydown", function (event) {
		if (event.which == 37) {
			var current = parseInt($(".canvas .selected").css("left"));
			$(".canvas .selected").css("left", current - 1);
			savePedalCanvas();
		}
	});

	// Move up
	$("body").on("keydown", function (event) {
		if (event.which == 38) {
			var current = parseInt($(".canvas .selected").css("top"));
			$(".canvas .selected").css("top", current - 1);
			event.preventDefault();
			savePedalCanvas();
		}
	});

	// Move right
	$("body").on("keydown", function (event) {
		if (event.which == 39) {
			var current = parseInt($(".canvas .selected").css("left"));
			$(".canvas .selected").css("left", current + 1);
			savePedalCanvas();
		}
	});

	// Move down
	$("body").on("keydown", function (event) {
		if (event.which == 40) {
			var current = parseInt($(".canvas .selected").css("top"));
			$(".canvas .selected").css("top", current + 1);
			event.preventDefault();
			savePedalCanvas();
		}
	});

	$("body").on("keydown", function (event) {
		event.stopPropagation();

		//mvital: in some cases click event is sent multiple times to the handler - no idea why
		//mvital: seems calling stopImmediatePropagation() helps
		event.stopImmediatePropagation();

		if (event.which == 82) {
			if ($(".canvas .selected").hasClass("rotate-90")) {
				$(".canvas .selected").removeClass("rotate-90");
				$(".canvas .selected").addClass("rotate-180");
			} else if ($(".canvas .selected").hasClass("rotate-180")) {
				$(".canvas .selected").removeClass("rotate-180");
				$(".canvas .selected").addClass("rotate-270");
			} else if ($(".canvas .selected").hasClass("rotate-270")) {
				$(".canvas .selected").removeClass("rotate-270");
			} else {
				$(".canvas .selected").addClass("rotate-90");
			}
			savePedalCanvas();
		}
	});
}); // End Document ready

function convertUnitsIfNeeded(type, value) {
	switch(type) {
		case 'pb':
			return ($('#input-unit-pb-wrapper span.on').text() === UNITS_IN) ? value : mmToIn(value);
		case 'pd':
			return ($('#input-unit-pd-wrapper span.on').text() === UNITS_IN) ? value : mmToIn(value);
		default:
			break;
	}
}

function mmToIn(value) {
	return Math.round((value * 0.0393701) * 100) / 100;
}

function readyCanvas(pedal) {
	var $draggable = $(".canvas .pedal, .canvas .pedalboard").draggabilly({
		containment: ".canvas",
	});

	$(".canvas .pedal, .canvas .pedalboard").draggabilly({
		containment: ".canvas",
	});

	$draggable.on("dragEnd", function (e) {
		console.log("dragEnd");
		ga("send", "event", "Canvas", "moved", "dragend");
		savePedalCanvas();
	});

	// $draggable.on( 'staticClick', function(event) {

	$draggable.on("staticClick", function (event) {
		//rotatePedal(this);
		var target = $(event.target);
		if (target.is(".delete")) {
			deletePedal(this);
			deselect();
			$("body").click();
		} else if (target.is(".rotate")) {
			event.stopPropagation();

			//mvital: in some cases click event is sent multiple times to the handler - no idea why
			//mvital: seems calling stopImmediatePropagation() helps
			event.stopImmediatePropagation();

			//rotatePedal(this);
			if ($(this).hasClass("rotate-90")) {
				$(this).removeClass("rotate-90");
				$(this).addClass("rotate-180");
			} else if ($(this).hasClass("rotate-180")) {
				$(this).removeClass("rotate-180");
				$(this).addClass("rotate-270");
			} else if ($(this).hasClass("rotate-270")) {
				$(this).removeClass("rotate-270");
			} else {
				$(this).addClass("rotate-90");
			}
			savePedalCanvas();
		}
	});

	savePedalCanvas();
}

function savePedalCanvas() {
	console.log("Canvas Saved!");
	localStorage["pedalCanvas"] = JSON.stringify($(".canvas").html());
}

function rotatePedal(pedal) {
	ga("send", "event", "Pedal", "clicked", "rotate");
	if ($(pedal).hasClass("rotate-90")) {
		$(pedal).removeClass("rotate-90");
		$(pedal).addClass("rotate-180");
	} else if ($(pedal).hasClass("rotate-180")) {
		$(pedal).removeClass("rotate-180");
		$(pedal).addClass("rotate-270");
	} else if ($(pedal).hasClass("rotate-270")) {
		$(pedal).removeClass("rotate-270");
	} else {
		$(pedal).addClass("rotate-90");
	}
	savePedalCanvas();
}

function deletePedal(pedal) {
	$(pedal).remove();
	deselect();
	savePedalCanvas();
}

function deselect() {
	$(".canvas .panel").remove();
	$(".canvas .selected").removeClass("selected");
	savePedalCanvas();
}

function deleteSelected() {
	$(".canvas .selected").remove();
	$(".canvas .panel").remove();
	savePedalCanvas();
}

// function rotatePedal() {
// 	alert("rotate Pedal");
// 	if ( $(this).hasClass("rotate-90") ) {
// 		$(this).removeClass("rotate-90");
// 		$(this).addClass("rotate-180");
// 	} else if ( $(this).hasClass("rotate-180") ) {
// 		$(this).removeClass("rotate-180");
// 		$(this).addClass("rotate-270");
// 	}  else if ( $(this).hasClass("rotate-270") ) {
// 		$(this).removeClass("rotate-270");
// 	} else {
// 		$(this).addClass("rotate-90");
// 	}
// 	return false;
// }

window.Pedal = function (type, brand, name, width, height, image) {
	this.Type = type || "";
	this.Brand = brand || "";
	this.Name = name || "";
	this.Width = width || "";
	this.Height = height || "";
	this.Image = image || "";
};

window.GetPedalData = function () {
	console.log('GetPedalData - Loading from API...');
	showLoadingMessage('Loading pedals...');
	
	APIService.getPedals(
		function(apiResponse) {
			hideLoadingMessage();
			console.log('Pedals loaded successfully from API');
			
			var pedals = [];
			// Handle both API response formats (object with data property or direct array)
			var pedalData = apiResponse.data || apiResponse;
			pedalData.forEach(function(pedal) {
				pedals.push(new Pedal(
					pedal.Type || "", // Type field
					pedal.Brand || pedal.brand,
					pedal.Name || pedal.name,
					pedal.Width || pedal.width,
					pedal.Height || pedal.height,
					pedal.Image || pedal.image
				));
			});
			
			// Pedals are already sorted by API (sort=brand&order=asc)
			pedals.forEach(RenderPedals);
			listPedals(pedals);
		},
		function(xhr, status, error) {
			hideLoadingMessage();
			showErrorMessage('Failed to load pedals: ' + error + '. Please ensure the API server is running.');
		}
	);
};

window.RenderPedals = function (pedals) {
	var { Type, Brand, Name, Width, Height, Image } = pedals;
	var option = $("<option>", {
		text: `${Brand} ${Name}`,
		// id: `${Name.toLowerCase().replace(/(\s+)|(['"])/g, (m, p1, p2) => p1 ? "-" : "")}`,
		data: {
			width: Width,
			height: Height,
			image: Image,
		},
	});
	if ($("optgroup").is(`[label="${Brand}"]`)) {
		$(`optgroup[label="${Brand}"]`).append(option);
	} else {
		$("<optgroup>", {
			label: Brand,
			html: option,
		}).appendTo(".pedal-list");
	}
};

window.PedalBoard = function (brand, name, width, height, image) {
	this.Brand = brand || "";
	this.Name = name || "";
	this.Width = width || "";
	this.Height = height || "";
	this.Image = image || "";
};

window.GetPedalBoardData = function () {
	console.log('GetPedalBoardData - Loading from API...');
	showLoadingMessage('Loading pedalboards...');
	
	APIService.getPedalboards(
		function(apiResponse) {
			hideLoadingMessage();
			console.log('Pedalboards loaded successfully from API');
			
			var pedalboards = [];
			// Handle both API response formats (object with data property or direct array)
			var boardData = apiResponse.data || apiResponse;
			boardData.forEach(function(board) {
				pedalboards.push(new PedalBoard(
					board.Brand || board.brand,
					board.Name || board.name,
					board.Width || board.width,
					board.Height || board.height,
					board.Image || board.image
				));
			});
			
			// Pedalboards are already sorted by API (sort=brand&order=asc)
			RenderPedalBoards(pedalboards);
		},
		function(xhr, status, error) {
			hideLoadingMessage();
			showErrorMessage('Failed to load pedalboards: ' + error + '. Please ensure the API server is running.');
		}
	);
};

window.RenderPedalBoards = function (pedalboards) {
	// console.log('RenderPedalBoards');
	for (var i in pedalboards) {
		// var $pedalboard = $("<option>"+ pedalboards[i].Brand + " " + pedalboards[i].Name +"</option>").attr('id', pedalboards[i].Name.toLowerCase().replace(/\s+/g, "-").replace(/'/g, ''));
		var $pedalboard = $(
			"<option>" + pedalboards[i].Brand + " " + pedalboards[i].Name + "</option>"
		);
		$pedalboard.data("width", pedalboards[i].Width);
		$pedalboard.data("height", pedalboards[i].Height);
		$pedalboard.data("height", pedalboards[i].Height);
		$pedalboard.data("image", pedalboards[i].Image);
		$pedalboard.appendTo(".pedalboard-list");
	}
};

// List pedals on page to find errors
window.listPedals = function (pedals) {
	if ($("#list-pedals").length) {
		// console.log('List pedals...');
		for (var i in pedals) {
			multiplier = 40;
			Width = pedals[i].Width * multiplier;
			Height = pedals[i].Height * multiplier;

			var $pedalListing = $(
				'<div class="pedal-listing">\
				<img src="' +
					pedalImagePath +
					pedals[i].Image +
					'" alt="' +
					pedals[i].Brand +
					" " +
					pedals[i].Name +
					'" width="' +
					Width +
					'" height="' +
					Height +
					'"/>\
				<p class="pedal-brand">' +
					pedals[i].Brand +
					'</p>\
				<p class="pedal-name">' +
					pedals[i].Name +
					"</p>\
			</div>"
			);
			// $pedalListing.css('width', pedals[i].Width);
			// $pedalListing.css('height', pedals[i].Height);
			// $pedalListing.css('background-image', "url(" + pedals[i].Image + ")" );
			$pedalListing.appendTo("#list-pedals");
		}
	}
};

var GenRandom = {
	Stored: [],
	Job: function () {
		var newId = Date.now().toString().substr(3); // or use any method that you want to achieve this string
		if (!this.Check(newId)) {
			this.Stored.push(newId);
			return newId;
		}
		return this.Job();
	},
	Check: function (id) {
		for (var i = 0; i < this.Stored.length; i++) {
			if (this.Stored[i] == id) return true;
		}
		return false;
	},
};

$("body").on("click", ".item", function (e) {
	var pedal = $(this);
	var id = $(this).attr("id");
	var pedalName = $(this).attr("title");
	var width = $(this).attr("data-width");
	var height = $(this).attr("data-height");
	var markup =
		'<div class="panel" data-id="#' +
		id +
		'">\
    <div class="panel__name">' +
		pedalName +
		'<br><span class="panel__dimensions">(' +
		width +
		" x " +
		height +
		')</span>\
    </div>\
		<a href="#rotate" class="panel__action">Rotate <i>R</i></a>\
		<a href="#front" class="panel__action">Move Front <i>]</i></a>\
		<a href="#back" class="panel__action">Move Back <i>[</i></a>\
		<a href="#delete" class="panel__action">Delete <i>D</i></a>\
	</div>';

	// reset stuff
	$(".panel").remove();
	$(".canvas .selected").removeClass("selected");

	// add stuff
	$(pedal).addClass("selected");
	$(".canvas").after(markup);

	// Prevent bubble up to .canvas
	e.stopPropagation();
});

$("body").on("click", 'a[href="#rotate"]', function (e) {
	e.stopPropagation();
	e.stopImmediatePropagation();

	var id = $(this).parents(".panel").data("id");
	if ($(id).hasClass("rotate-90")) {
		$(id).removeClass("rotate-90");
		$(id).addClass("rotate-180");
	} else if ($(id).hasClass("rotate-180")) {
		$(id).removeClass("rotate-180");
		$(id).addClass("rotate-270");
	} else if ($(id).hasClass("rotate-270")) {
		$(id).removeClass("rotate-270");
	} else {
		$(id).addClass("rotate-90");
	}
	savePedalCanvas();
});

$("body").on("click", 'a[href="#delete"]', function () {
	var id = $(this).parents(".panel").data("id");
	$(id).remove();
	$(".panel").remove();
	savePedalCanvas();
});

$("body").on("click", 'a[href="#front"]', function (e) {
	e.stopImmediatePropagation();
	var id = $(this).parents(".panel").data("id");
	$(id).next().insertBefore(id);
	savePedalCanvas();
	e.stopPropagation();
});

$("body").on("click", 'a[href="#back"]', function (e) {
	e.stopImmediatePropagation();
	var id = $(this).parents(".panel").data("id");
	$(id).prev().insertAfter(id);
	savePedalCanvas();
	e.stopPropagation();
});

$("body").click(function () {
	// reset stuff
	$(".panel").remove();
	$(".canvas .selected").removeClass("selected");
});