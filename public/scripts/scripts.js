var pedalImagePath = "public/images/pedals/";
var pedalboardImagePath = "public/images/pedalboards/";
var units = 'in';

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
	
	convertUnits();

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
		// Load canvas from localStorage if it has been saved prior
		if (localStorage["pedalCanvas"] != null) {
			var savedPedalCanvas = JSON.parse(localStorage["pedalCanvas"]);
			$(".canvas").html(savedPedalCanvas);
			readyCanvas();
		}

		// If hidden multiplier value doesn't exist, create it
		if ($("#multiplier").length == 0) {
			$(".canvas").append('<input id="multiplier" type="hidden" value="32">');
			var multiplier = 32;
			// If hidden multiplier value does exist set variable
		} else {
			var multiplier = $("#multiplier").val();
		}

		// Set canvas scale input and bg size to match scale
		$("#canvas-scale").val(multiplier);
		$(".canvas").css("background-size", multiplier + "px");
	});

	$("#convert-units").on( "change", function() {
		convertUnits();
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

	$("body").on("click", "#save-canvas", function (e) {
		const currentDate = new Date().toLocaleDateString() + new Date().toLocaleTimeString();

		downloadPedalCanvas("Pedal Playground - " + currentDate + ".json");
	});

	$("body").on("click", "#load-canvas", function (e) {
		uploadPedalCanvas();
		savePedalCanvas();
		readyCanvas();
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
		var width = convertUnitsIfNeeded("down", $("#add-custom-pedal .custom-width").val() );
		var height = convertUnitsIfNeeded("down", $("#add-custom-pedal .custom-height").val() );
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
			//console.log("add custom pedal...");
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
		var width = convertUnitsIfNeeded('down', $("#add-custom-pedalboard .custom-width").val());
		var height = convertUnitsIfNeeded('down',$("#add-custom-pedalboard .custom-height").val());
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
			//console.log("add custom pedalboard...");
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
			$(".site-body > .item-info").remove();
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

function convertUnitsIfNeeded(direction,value) {
	switch(direction) {
		case 'up':
			return ( $('#convert-units').is(':checked') ) ? convertIn(value) : value;
		case 'down':
			return ( $('#convert-units').is(':checked') ) ? convertMm(value) : value;
		default:
			break;
	}
}

function convertMm(value) {
	return Math.round((value * 0.0393701) * 100) / 100;
}

function convertIn(value) {
	return Math.round((value * 25.4));
}

function readyCanvas() {
	//console.log("canvas ready!");

	var $draggable = $(".canvas .pedal, .canvas .pedalboard").draggabilly({
		containment: ".canvas",
	});

	$(".canvas .pedal, .canvas .pedalboard").draggabilly({
		containment: ".canvas",
	});

	$draggable.on("dragEnd", function (e) {
		//console.log("dragEnd");
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
	//console.log("Canvas Saved!");
	localStorage["pedalCanvas"] = JSON.stringify($(".canvas").html());
	// readyCanvas();
}

function exportPedalCanvas() {
	return new Blob(
		[ JSON.stringify(
			{
				source: "pedalplayground.com",
				version: "1.0",
				canvas: JSON.parse(localStorage["pedalCanvas"])
			}
		)],
		{ type: "application/json" }
	);
}

function downloadPedalCanvas(filename) {
	//console.log("Downloading canvas to " + filename);

	const blob = exportPedalCanvas();

	const url = window.URL.createObjectURL(blob);

	const a = document.createElement("a");
	a.style.display = "none";
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();

	window.URL.revokeObjectURL(url);
}

function importPedalCanvas(file) {
	//console.log("Importing canvas from " + file);

	var reader = new FileReader();

	reader.addEventListener(
		"load",
		() => {
			blob = JSON.parse(reader.result);

			// TODO: check source and version
			
			$(".canvas").html(blob.canvas);
			readyCanvas();
		},
		false,
	);

	reader.readAsText(file);
}

function uploadPedalCanvas() {
	//console.log("Uploading canvas ...");
	var input = document.createElement("input");
	input.type = 'file';
	input.onchange = _ => {
		var file = input.files[0];
		importPedalCanvas(file);
	};
	input.click();
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

function convertUnits() {
	if ( $('#convert-units').is(':checked') ) {
		var units = 'mm';
		$("label .units").text('(mm)');
		$('#custom-pb-width').attr('placeholder',610);
		$('#custom-pb-height').attr('placeholder',318);
		$('#custom-p-width').attr('placeholder',70);
		$('#custom-p-height').attr('placeholder',108);
	} else {
		var units = 'in';
		$("label .units").text('(inches)');
		$('#custom-pb-width').attr('placeholder',24);
		$('#custom-pb-height').attr('placeholder',12.5);
		$('#custom-p-width').attr('placeholder',2.75);
		$('#custom-p-height').attr('placeholder',4.25);
	}
}


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

	if ( $('#convert-units').is(':checked') ) {
		var units = 'mm';
	} else {
		var units = 'in';
	}

	var pedal = $(this);
	var id = $(this).attr("id");
	var pedalName = $(this).attr("title");

	var height = convertUnitsIfNeeded("up", $(this).attr("data-height") );
	var width = convertUnitsIfNeeded("up", $(this).attr("data-width") );;

	var markup =
		'<div class="panel item-info" data-id="#' +
		id +
		'">\
    <div class="panel__name">' +
		pedalName +
		'<br><span class="panel__dimensions">(' + width + units + " x " + height + units + ')</span>\
    </div>\
		<a href="#rotate" class="panel__action">Rotate <i>R</i></a>\
		<a href="#front" class="panel__action">Move Front <i>]</i></a>\
		<a href="#back" class="panel__action">Move Back <i>[</i></a>\
		<a href="#delete" class="panel__action">Delete <i>D</i></a>\
	</div>';

	// reset stuff
	$(".item-info").remove();
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
	$(".item-info").remove();
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
	$(".item-info").remove();
	$(".canvas .selected").removeClass("selected");
});

$("body").on("click", ".canvas", function (e) {
	$(".settings-popover").addClass("hide");
	$(".settings-trigger").removeClass("open");
});

$("body").on("click", ".settings-trigger", function (e) {
	$(".settings-popover").removeClass("hide");
	$(".settings-trigger").addClass("open");
	e.preventDefault();
	e.stopPropagation();
});


$("body").on("click", ".settings-trigger.open", function (e) {
	$(".settings-popover").addClass("hide");
	$(".settings-trigger").removeClass("open");
	e.preventDefault();
});