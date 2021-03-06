
setDefaults({
	allDaySlot: true,
	allDayText: 'all-day',
	firstHour: 6,
	slotMinutes: 30,
	defaultEventMinutes: 120,
	axisFormat: 'h(:mm)tt',
	timeFormat: {
		agenda: 'h:mm{ - h:mm}'
	},
	dragOpacity: {
		agenda: .5
	},
	minTime: 0,
	maxTime: 24
});

var MOUSEMOVE_TRIGGER_TIME = 40;

// TODO: make it work in quirks mode (event corners, all-day height)
// TODO: test liquid width, especially in IE6


function AgendaView(element, calendar, viewName) {
	var t = this;
	
	// exports
	t.showStationen = false; // Bind to the view...
	t.showOccupied = false;
	t.showAllCabinsOccupied = false;
	t.getStationNameDelta = getStationNameDelta;
	t.renderAgenda = renderAgenda;
	t.setWidth = setWidth;
	t.setHeight = setHeight;
	t.beforeHide = beforeHide;
	t.afterShow = afterShow;
	t.defaultEventEnd = defaultEventEnd;
	t.timePosition = timePosition;
	t.dayOfWeekCol = dayOfWeekCol;
	t.dateCell = dateCell;
	t.cellDate = cellDate;
	t.cellIsAllDay = cellIsAllDay;
	t.allDayRow = getAllDayRow;
	t.allDayBounds = allDayBounds;
	t.getHoverListener = function() { return hoverListener };
	t.colContentLeft = colContentLeft;
	t.colContentRight = colContentRight;
	t.getDaySegmentContainer = function() { return daySegmentContainer };
	t.getSlotSegmentContainer = function() { return slotSegmentContainer };
	t.getMinMinute = function() { return minMinute };
	t.getMaxMinute = function() { return maxMinute };
	t.getBodyContent = function() { return slotContent }; // !!??
	t.getRowCnt = function() { return 1 };
	t.getColCnt = function() { return colCnt };
	t.getColWidth = function() {
			return colWidth / stationen.length; 
	};
	t.getSlotHeight = function() { return slotHeight };
	t.defaultSelectionEnd = defaultSelectionEnd;
	t.renderDayOverlay = renderDayOverlay;
	t.renderSelection = renderSelection;
	t.clearSelection = clearSelection;
	t.reportDayClick = reportDayClick; // selection mousedown hack
	t.dragStart = dragStart;
	t.dragStop = dragStop;
	
	
	
	// imports
	View.call(t, element, calendar, viewName);
	// use AgendaViews implementation of eventElementHandlers:
	t.eventElementHandlers = eventElementHandlers;
	
	OverlayManager.call(t);
	SelectionManager.call(t);
	AgendaEventRenderer.call(t);
	var opt = t.opt;
	var trigger = t.trigger;
	var clearEvents = t.clearEvents;
	var renderOverlay = t.renderOverlay;
	var clearOverlays = t.clearOverlays;
	var reportSelection = t.reportSelection;
	var unselect = t.unselect;
	var daySelectionMousedown = t.daySelectionMousedown;
	var slotSegHtml = t.slotSegHtml;
	var formatDate = calendar.formatDate;
	

	
	
	
	// locals
	
	var dayTable;
	var dayHead;
	var dayHeadCells;
	var dayFoot;
	var dayFootCells;
	var dayBody;
	var dayBodyCells;
	var dayBodyCellInners;
	var dayBodyFirstCell;
	var dayBodyFirstCellStretcher;
	var slotLayer;
	var daySegmentContainer;
	var allDayTable;
	var allDayRow;
	var slotScroller;
	var slotContent;
	var slotSegmentContainer;
	var slotTable;
	var slotTableFirstInner;
	var axisFirstCells;
	var gutterCells;
	var selectionHelper;
	
	var viewWidth;
	var viewHeight;
	var axisWidth;
	var colWidth;
	var gutterWidth;
	var slotHeight; // TODO: what if slotHeight changes? (see issue 650)
	var savedScrollTop;
	
	var colCnt;
	var slotCnt;
	var coordinateGrid;
	var hoverListener;
	var colContentPositions;
	var slotTopCache = {};
	
	var tm;
	var firstDay;
	var nwe;            // no weekends (int)
	var rtl, dis, dit;  // day index sign / translate
	var minMinute, maxMinute;
	var colFormat;
	var seperateEventSources; //This variable inidcates if there should be rendered a seperate Column for eaxh event-source.
	
	var stationen;
	
	/* Rendering
	-----------------------------------------------------------------------------*/
	
	
	disableTextSelection(element.addClass('fc-agenda'));
	
	
	function renderAgenda(c) {

		
		colCnt = c;
		updateOptions();
		if (!dayTable) {
			buildSkeleton();
		}else{
			clearEvents();
		}
		updateCells();
	}
	
	
	
	function updateOptions() {
		stationen = calendar.options.stationen;
		if(stationen == undefined || t.showStationen == undefined || t.showStationen == false){
			stationen = [{name: "", slots: 0}];
			
		}
		
		tm = opt('theme') ? 'ui' : 'fc';
		nwe = opt('weekends') ? 0 : 1;
		firstDay = opt('firstDay');
		if (rtl = opt('isRTL')) {
			dis = -1;
			dit = colCnt - 1;
		}else{
			dis = 1;
			dit = 0;
		}
		minMinute = parseTime(opt('minTime'));
		maxMinute = parseTime(opt('maxTime'));
		colFormat = opt('columnFormat');
	}
	
	
	
	function buildSkeleton() {
		var headerClass = tm + "-widget-header";
		var contentClass = tm + "-widget-content";
		var s;
		var i;
		var d;
		var maxd;
		var minutes;
		var slotNormal = opt('slotMinutes') % 15 == 0;

		s =
			"<table style='width:100%' class='fc-agenda-days fc-border-separate' cellspacing='0'>" +
			"<thead>" +
			"<tr>" +
			"<th class='fc-agenda-axis " + headerClass + "'>&nbsp;</th>";
		
		for (i=0; i<colCnt; i++) {
			s +=
				"<th colspan='"+stationen.length+"'class='fc- fc-col" + i + ' ' + headerClass + "'/>"; // fc- needed for setDayID
		}
		s +=
			"<th class='fc-agenda-gutter " + headerClass + "'>&nbsp;</th>" +
			"</tr>";
			
		s += "</thead>" +
			"<tbody>";
		
		
		s+=	"<tr>" +
			"<th class='fc-agenda-axis " + headerClass + "'>&nbsp;</th>";
		for (i=0; i<colCnt; i++) {
			for(var j=0; j<stationen.length; j++){
				s +=
					"<td class='fc- fc-col" + i + ' ' + contentClass + " th-station"+j+"'>" + // fc- needed for setDayID
					"<div>" +
					"<div class='fc-day-content'>" +
					"<div style='position:relative'>&nbsp;</div>" +
					"</div>" +
					"</div>" +
					"</td>";
			}
			
		}
		s +=
			"<td class='fc-agenda-gutter " + contentClass + "'>&nbsp;</td>" +
			"</tr>" +
			"</tbody>" +
			"<tfoot>" +
			"<tr>" +
			"<th class='fc-agenda-axis " + headerClass + "'>&nbsp;</th>";
		for (i=0; i<colCnt; i++) {
			s +=
				"<th colspan='"+stationen.length+"'class='fc- fc-col" + i + ' ' + headerClass + "'/>"; // fc- needed for setDayID
		}
				
		s += "<th class='fc-agenda-gutter " + headerClass + "'>&nbsp;</th>" +
			"</tr>" +
			"</tfoot>" +	
			"</table>";
		dayTable = $(s).appendTo(element);
		dayHead = dayTable.find('thead');
		dayFoot = dayTable.find('tfoot');
		dayHeadCells = dayHead.find('th').slice(1, -1);
		dayFootCells = dayFoot.find('th').slice(1, -1);
		dayBody = dayTable.find('tbody');
		dayBodyCells = dayBody.find('td').slice(0, -1);
		dayBodyCellInners = dayBodyCells.find('div.fc-day-content div');
		dayBodyFirstCell = dayBodyCells.eq(0);
		dayBodyFirstCellStretcher = dayBodyFirstCell.find('> div');
		
		markFirstLast(dayHead.add(dayHead.find('tr')));
		markFirstLast(dayFoot.add(dayFoot.find('tr')));
		markFirstLast(dayBody.add(dayBody.find('tr')));
		
		axisFirstCells = dayHead.find('th:first');
		gutterCells = dayTable.find('.fc-agenda-gutter');
		
		slotLayer =
			$("<div id='ther_slotLayer' style='position:absolute;z-index:2;left:0;width:100%'/>")
				.appendTo(element);
				
		if(t.showStationen == true){
			//Print cabin Names
			daySegmentContainer =
				$("<div id='ther_cabinNames_NFC2LIFE' style='position:absolute;z-index:8;top:0;left:0'/>")
					.appendTo(slotLayer);
			s =
				"<table style='width:100%' class='ther-agenda-cabinnames' cellspacing='0' name='ther_cabinNameTable_2XWE5HSJ'>";
				
			
			s += "<tr>" + "<th class='fc-agenda-axis fc-widget-header'>&nbsp;</th>";
			for(i=0; i<stationen.length; i++){
				s+= "<td class = 'fc-widget-content' style = 'width: " +(93/stationen.length)+"%; font-size: 70%'><b>"+stationen[i].name+"</b></td>";
			}
			s+= "<th class='" + headerClass + " fc-agenda-gutter'>&nbsp;</th>" +
			"</tr>" +
			"</table>";
			
			var cabinNameTables = $(s).appendTo(slotLayer);
			axisFirstCells = axisFirstCells.add(cabinNameTables.find('th:first'));
			gutterCells = gutterCells.add(cabinNameTables.find('th.fc-agenda-gutter'));
			
		}
		
		if (opt('allDaySlot')) {
		
			daySegmentContainer =
				$("<div id='ther_daySegmentContainer' style='position:absolute;z-index:8;top:0;left:0'/>")
					.appendTo(slotLayer);
		
			s =
				"<table style='width:100%' class='fc-agenda-allday' cellspacing='0' name='ther_allDayTable_IE5WOW92'>" +
				"<tr>" +
				"<th class='" + headerClass + " fc-agenda-axis'>" + opt('allDayText') + "</th>" +
				"<td>" +
				"<div class='fc-day-content'><div style='position:relative'/></div>" +
				"</td>" +
				"<th class='" + headerClass + " fc-agenda-gutter'>&nbsp;</th>" +
				"</tr>" +
				"</table>";
			allDayTable = $(s).appendTo(slotLayer);
			allDayRow = allDayTable.find('tr');
			
			dayBind(allDayRow.find('td'));
			
			axisFirstCells = axisFirstCells.add(allDayTable.find('th:first'));
			gutterCells = gutterCells.add(allDayTable.find('th.fc-agenda-gutter'));
			
			slotLayer.append(
				"<div class='fc-agenda-divider " + headerClass + "'>" +
				"<div class='fc-agenda-divider-inner'/>" +
				"</div>"
			);
			
		}else{
		
			daySegmentContainer = $([]); // in jQuery 1.4, we can just do $()
		
		}

		
		slotScroller =
			$("<div id='slotty' style='position:absolute;width:100%;overflow-x:hidden;overflow-y:auto'/>")
				.appendTo(slotLayer);
				
		slotContent =
			$("<div id='ther_slotContent' style='position:relative;width:100%;overflow:hidden'/>")
				.appendTo(slotScroller);
				
		slotSegmentContainer =
			$("<div style='position:absolute;z-index:8;top:0;left:0' id='ther_slotSegmentContainer' />")
				.appendTo(slotContent);
		
		s =
			"<table class='fc-agenda-slots' style='width:100%' cellspacing='0'>" +
			"<tbody>";
		d = zeroDate();
		maxd = addMinutes(cloneDate(d), maxMinute);
		addMinutes(d, minMinute);
		slotCnt = 0;
		for (i=0; d < maxd; i++) {
			minutes = d.getMinutes();
			s +=
				"<tr class='fc-slot" + i + ' ' + (!minutes ? '' : 'fc-minor') + "'>" +
				"<th class='fc-agenda-axis " + headerClass + "'>" +
				((!slotNormal || !minutes) ? formatDate(d, opt('axisFormat')) : '&nbsp;') +
				"</th>";
				
			for(var j = 0; j < stationen.length; j++){
				s+=
					"<td class='" + contentClass + " station"+j+"'>" +
					"<div style='position:relative; color: lightgrey; text-align: center'>" +
					((!slotNormal || !minutes) ? formatDate(d, opt('axisFormat')) : '&nbsp;') +
					"</div>" +
					"</td>";
			}
				
				
			s += "</tr>";
			addMinutes(d, opt('slotMinutes'));
			slotCnt++;
		}
		s +=
			"</tbody>" +
			"</table>";
		slotTable = $(s).appendTo(slotContent);
		slotTableFirstInner = slotTable.find('div:first');
		
		slotBind(slotTable.find('td'));
		
		axisFirstCells = axisFirstCells.add(slotTable.find('th:first'));
	}
	
	
	
	function updateCells() {
		var i;
		var headCell;
		var footCell;
		var bodyCell;
		var date;
		var today = clearTime(new Date());
		for (i=0; i<colCnt; i++) {
			date = colDate(i);
			headCell = dayHeadCells.eq(i);
			headCell.html(formatDate(date, colFormat));
			footCell = dayFootCells.eq(i);
			footCell.html(formatDate(date, colFormat));
			for(var j = 0; j< stationen.length; j++){
				var cnt = (stationen.length * i) + j;
				bodyCell = dayBodyCells.eq(cnt);
				if (+date == +today) {
					bodyCell.addClass(tm + '-state-highlight fc-today');
				}else{
					bodyCell.removeClass(tm + '-state-highlight fc-today');
				}
				setDayID(headCell.add(bodyCell), date);
				setDayID(footCell.add(bodyCell), date);
			}
			
		}
	}
	
	
	
	function setHeight(height, dateChanged) {
		if (height === undefined) {
			height = viewHeight;
		}
		viewHeight = height;
		slotTopCache = {};
	
		var headHeight = dayBody.position().top;
		var allDayHeight = slotScroller.position().top; // including divider
		var bodyHeight = Math.min( // total body height, including borders
			height - headHeight,   // when scrollbars
			slotTable.height() + allDayHeight + 1 // when no scrollbars. +1 for bottom border
		);
		
		dayBodyFirstCellStretcher
			.height(bodyHeight - vsides(dayBodyFirstCell));
		
		slotLayer.css('top', headHeight);
		
		slotScroller.height(bodyHeight - allDayHeight - 1);
		
		slotHeight = slotTableFirstInner.height() + 1; // +1 for border
		
		if (dateChanged) {
			resetScroll();
		}
	}
	
	
	
	function setWidth(width) {
		viewWidth = width;
		colContentPositions.clear();
		
		axisWidth = 0;
		setOuterWidth(
			axisFirstCells
				.width('')
				.each(function(i, _cell) {
					axisWidth = Math.max(axisWidth, $(_cell).outerWidth());
				}),
			axisWidth
		);
		
		var slotTableWidth = slotScroller[0].clientWidth; // needs to be done after axisWidth (for IE7)
		//slotTable.width(slotTableWidth);
		
		gutterWidth = slotScroller.width() - slotTableWidth;
		if (gutterWidth) {
			setOuterWidth(gutterCells, gutterWidth);
			gutterCells
				.show()
				.prev()
				.removeClass('fc-last');
		}else{
			gutterCells
				.hide()
				.prev()
				.addClass('fc-last');
		}
		
		colWidth = Math.floor((slotTableWidth - axisWidth) / colCnt);
		setOuterWidth(dayHeadCells.slice(0, -1), colWidth);
		setOuterWidth(dayFootCells.slice(0, -1), colWidth);
	}
	


	function resetScroll() {
		var d0 = zeroDate();
		var scrollDate = cloneDate(d0);
		scrollDate.setHours(opt('firstHour'));
		var top = timePosition(d0, scrollDate) + 1; // +1 for the border
		function scroll() {
			slotScroller.scrollTop(top);
		}
		scroll();
		setTimeout(scroll, 0); // overrides any previous scroll state made by the browser
	}
	
	
	function beforeHide() {
		savedScrollTop = slotScroller.scrollTop();
	}
	
	
	function afterShow() {
		slotScroller.scrollTop(savedScrollTop);
	}
	
	
	
	/* Slot/Day clicking and binding
	-----------------------------------------------------------------------*/
	

	function dayBind(cells) {
		cells.click(slotClick)
			.mousedown(daySelectionMousedown);
	}


	function slotBind(cells) {
		cells.click(slotClick)
			.mousedown(slotSelectionMousedown);
		cells.mousemove(slotMousemove);
	}
	
	
	function slotClick(ev) {
		if (!opt('selectable')) { // if selectable, SelectionManager will worry about dayClick
			var col = Math.min(colCnt-1, Math.floor((ev.pageX - dayTable.offset().left - axisWidth) / colWidth));
			var stationNumber = Math.min((stationen.length)-1, Math.floor((ev.pageX - dayTable.offset().left - axisWidth) / (colWidth/stationen.length)));
			
			var date = colDate(col);
			var rowMatch = this.parentNode.className.match(/fc-slot(\d+)/); // TODO: maybe use data
			if (rowMatch) {
				var mins = parseInt(rowMatch[1]) * opt('slotMinutes');
				var hours = Math.floor(mins/60);
				date.setHours(hours);
				date.setMinutes(mins%60 + minMinute);
				trigger('dayClick', dayBodyCells[col], date, false, ev, t.getStationNameDelta(null, stationNumber));
			}else{
				trigger('dayClick', dayBodyCells[col], date, true, ev, t.getStationNameDelta(null, stationNumber));
			}
		}
	}
	
	var lastSlotMouseMoveDate = new Date();
	function slotMousemove(ev){
		var tmpDate = new Date();
		if(tmpDate.getTime()-lastSlotMouseMoveDate.getTime() < MOUSEMOVE_TRIGGER_TIME) return false;
		lastSlotMouseMoveDate = tmpDate;
		
		var col = Math.min(colCnt-1, Math.floor((ev.pageX - dayTable.offset().left - axisWidth) / colWidth));
		var stationNumber = Math.min((stationen.length)-1, Math.floor((ev.pageX - dayTable.offset().left - axisWidth) / (colWidth/stationen.length)));
		
		var date = colDate(col);
		var rowMatch = this.parentNode.className.match(/fc-slot(\d+)/); // TODO: maybe use data
		if (rowMatch) {
			var mins = parseInt(rowMatch[1]) * opt('slotMinutes');
			var hours = Math.floor(mins/60);
			date.setHours(hours);
			date.setMinutes(mins%60 + minMinute);
			trigger('slotMousemove', dayBodyCells[col], date, false, ev, t.getStationNameDelta(null, stationNumber));
		}else{
			trigger('slotMousemove', dayBodyCells[col], date, true, ev, t.getStationNameDelta(null, stationNumber));
		}
	}
	var lastEventMouseMoveDate = new Date();
	function eventElementHandlers(event, eventElement) {
		eventElement
			.click(function(ev) {
					var stationNumber = Math.min((stationen.length)-1, Math.floor((ev.pageX - dayTable.offset().left - axisWidth) / (colWidth/stationen.length)));
					var col = Math.min(colCnt-1, Math.floor((ev.pageX - dayTable.offset().left - axisWidth) / colWidth));
					var clickDate = colDate(col);
					
					var colCount = 1;
					var prevTr = $("tr.fc-slot0");
					for(colCount = 1; true; colCount++){
						var nextTr = $("tr.fc-slot"+colCount);
						if(nextTr.size() == 0){
							// No slot-tr exists anymore...
							colCount = -10;
							break;
						}
						if(ev.pageY >= prevTr.offset().top && ev.pageY <= nextTr.offset().top){
							break;
						}
						prevTr = nextTr;
					}
					colCount--;
					
					if (colCount>=0) {
						var mins = colCount * opt('slotMinutes');
						var hours = Math.floor(mins/60);
						clickDate.setHours(hours);
						clickDate.setMinutes(mins%60 + minMinute);
					}
					if (!eventElement.hasClass('ui-draggable-dragging') &&
							!eventElement.hasClass('ui-resizable-resizing')) {
								return trigger('eventClick', this, event, ev, clickDate, t.getStationNameDelta(null, stationNumber));
					}
				
			})
			.hover(
				function(ev) {
					trigger('eventMouseover', this, event, ev);
				},
				function(ev) {
					trigger('eventMouseout', this, event, ev);
				}
			)
			.mousemove(function(ev){
				var tmpDate = new Date();
				if(tmpDate.getTime()-lastEventMouseMoveDate.getTime() < MOUSEMOVE_TRIGGER_TIME){
					return false;
				}
				lastEventMouseMoveDate = tmpDate;
				
				var stationNumber = Math.min((stationen.length)-1, Math.floor((ev.pageX - dayTable.offset().left - axisWidth) / (colWidth/stationen.length)));
				var col = Math.min(colCnt-1, Math.floor((ev.pageX - dayTable.offset().left - axisWidth) / colWidth));
				var clickDate = colDate(col);
				
				var colCount = 1;
				var prevTr = $("tr.fc-slot0");
				for(colCount = 1; true; colCount++){
					var nextTr = $("tr.fc-slot"+colCount);
					if(nextTr.size() == 0){
						// No slot-tr exists anymore...
						colCount = -10;
						break;
					}
					if(ev.pageY >= prevTr.offset().top && ev.pageY <= nextTr.offset().top){
						break;
					}
					prevTr = nextTr;
				}
				colCount--;
				
				if (colCount>=0) {
					var mins = colCount * opt('slotMinutes');
					var hours = Math.floor(mins/60);
					clickDate.setHours(hours);
					clickDate.setMinutes(mins%60 + minMinute);
				}
				if (!eventElement.hasClass('ui-draggable-dragging') &&
						!eventElement.hasClass('ui-resizable-resizing')) {
							return trigger('eventMousemove', this, event, ev, clickDate, t.getStationNameDelta(null, stationNumber));
				}
			});
		// TODO: don't fire eventMouseover/eventMouseout *while* dragging is occuring (on subject element)
		// TODO: same for resizing
	}
	
	
	
	/* Semi-transparent Overlay Helpers
	-----------------------------------------------------*/
	

	function renderDayOverlay(startDate, endDate, refreshCoordinateGrid) { // endDate is exclusive
		if (refreshCoordinateGrid) {
			coordinateGrid.build();
		}
		var visStart = cloneDate(t.visStart);
		var startCol, endCol;
		if (rtl) {
			startCol = dayDiff(endDate, visStart)*dis+dit+1;
			endCol = dayDiff(startDate, visStart)*dis+dit+1;
		}else{
			startCol = dayDiff(startDate, visStart);
			endCol = dayDiff(endDate, visStart);
		}
		startCol = Math.max(0, startCol);
		endCol = Math.min(colCnt, endCol);
		if (startCol < endCol) {
			dayBind(
				renderCellOverlay(0, startCol, 0, endCol-1)
			);
		}
	}
	
	
	function renderCellOverlay(row0, col0, row1, col1) { // only for all-day?
		var rect = coordinateGrid.rect(row0, col0, row1, col1, slotLayer);
		return renderOverlay(rect, slotLayer);
	}
	

	function renderSlotOverlay(overlayStart, overlayEnd) {
		var dayStart = cloneDate(t.visStart);
		var dayEnd = addDays(cloneDate(dayStart), 1);
		for (var i=0; i<colCnt; i++) {
			var stretchStart = new Date(Math.max(dayStart, overlayStart));
			var stretchEnd = new Date(Math.min(dayEnd, overlayEnd));
			if (stretchStart < stretchEnd) {
				var col = i*dis+dit;
				var rect = coordinateGrid.rect(0, col, 0, col, slotContent); // only use it for horizontal coords
				var top = timePosition(dayStart, stretchStart);
				var bottom = timePosition(dayStart, stretchEnd);
				rect.top = top;
				rect.height = bottom - top;
				slotBind(
					renderOverlay(rect, slotContent)
				);
			}
			addDays(dayStart, 1);
			addDays(dayEnd, 1);
		}
	}
	
	
	
	/* Coordinate Utilities
	-----------------------------------------------------------------------------*/
	
	
	coordinateGrid = new CoordinateGrid(function(rows, cols) {
		var e, n, p;
		var x0 = 0;
		var cabins = 1;
		if(t.showStationen == true){
			cabins = stationen.length;
		}
		dayHeadCells.each(function(i, _e) {
			e = $(_e);
			n = e.offset().left;
			if(i>0){
				addCellsToArray(cols, x0, n, cabins);
			}
			x0 = n;
		});
		dayFootCells.each(function(i, _e) {
			e = $(_e);
			n = e.offset().left;
			if(i>0){
				addCellsToArray(cols, x0, n, cabins);
			}
			x0 = n;
		});
		addCellsToArray(cols, x0, x0 + e.outerWidth(), cabins);
		if (opt('allDaySlot')) {
			e = allDayRow;
			n = e.offset().top;
			rows[0] = [n, n+e.outerHeight()];
		}
		var slotTableTop = slotContent.offset().top;
		var slotScrollerTop = slotScroller.offset().top;
		var slotScrollerBottom = slotScrollerTop + slotScroller.outerHeight();
		function constrain(n) {
			return Math.max(slotScrollerTop, Math.min(slotScrollerBottom, n));
		}
		for (var i=0; i<slotCnt; i++) {
			rows.push([
				constrain(slotTableTop + slotHeight*i),
				constrain(slotTableTop + slotHeight*(i+1))
			]);
		}
	});
	
	
	hoverListener = new HoverListener(coordinateGrid);
	
	
	colContentPositions = new HorizontalPositionCache(function(col) {
		return dayBodyCellInners.eq(col);
	});
	
	
	function colContentLeft(col) {
		return colContentPositions.left(col);
	}
	
	
	function colContentRight(col) {
		return colContentPositions.right(col);
	}
	
	
	
	
	function dateCell(date) { // "cell" terminology is now confusing
		return {
			row: Math.floor(dayDiff(date, t.visStart) / 7),
			col: dayOfWeekCol(date.getDay())
		};
	}
	
	
	function cellDate(cell) {
		var d = colDate(cell.col);
		var slotIndex = cell.row;
		if (opt('allDaySlot')) {
			slotIndex--;
		}
		if (slotIndex >= 0) {
			addMinutes(d, minMinute + slotIndex * opt('slotMinutes'));
		}
		return d;
	}
	
	
	function colDate(col) { // returns dates with 00:00:00
		if(t.showStationen == true){
			//Don't add days when multiple cabins are shown
			//TODO this only works in single day view! Change this if you want to show multiple stations in other views (e.g. week views...)
			return cloneDate(t.visStart);
		}else{
			return addDays(cloneDate(t.visStart), col*dis+dit);
		}
		
	}
	
	
	function cellIsAllDay(cell) {
		return opt('allDaySlot') && !cell.row;
	}
	
	
	function dayOfWeekCol(dayOfWeek) {
		return ((dayOfWeek - Math.max(firstDay, nwe) + colCnt) % colCnt)*dis+dit;
	}
	
	
	
	
	// get the Y coordinate of the given time on the given day (both Date objects)
	function timePosition(day, time) { // both date objects. day holds 00:00 of current day
		day = cloneDate(day, true);
		if (time < addMinutes(cloneDate(day), minMinute)) {
			return 0;
		}
		if (time >= addMinutes(cloneDate(day), maxMinute)) {
			return slotTable.height();
		}
		var slotMinutes = opt('slotMinutes'),
			minutes = time.getHours()*60 + time.getMinutes() - minMinute,
			slotI = Math.floor(minutes / slotMinutes),
			slotTop = slotTopCache[slotI];
		if (slotTop === undefined) {
			slotTop = slotTopCache[slotI] = slotTable.find('tr:eq(' + slotI + ') td div')[0].offsetTop; //.position().top; // need this optimization???
		}
		return Math.max(0, Math.round(
			slotTop - 1 + slotHeight * ((minutes % slotMinutes) / slotMinutes)
		));
	}
	
	
	function allDayBounds() {
		return {
			left: axisWidth,
			right: viewWidth - gutterWidth
		}
	}
	
	
	function getAllDayRow(index) {
		return allDayRow;
	}
	
	
	function defaultEventEnd(event) {
		var start = cloneDate(event.start);
		if (event.allDay) {
			return start;
		}
		return addMinutes(start, opt('defaultEventMinutes'));
	}
	
	
	
	/* Selection
	---------------------------------------------------------------------------------*/
	
	
	function defaultSelectionEnd(startDate, allDay) {
		if (allDay) {
			return cloneDate(startDate);
		}
		return addMinutes(cloneDate(startDate), opt('slotMinutes'));
	}
	
	
	function renderSelection(startDate, endDate, allDay) { // only for all-day
		if (allDay) {
			if (opt('allDaySlot')) {
				renderDayOverlay(startDate, addDays(cloneDate(endDate), 1), true);
			}
		}else{
			renderSlotSelection(startDate, endDate);
		}
	}
	
	
	function renderSlotSelection(startDate, endDate) {
		var helperOption = opt('selectHelper');
		coordinateGrid.build();
		if (helperOption) {
			var col = dayDiff(startDate, t.visStart) * dis + dit;
			if (col >= 0 && col < colCnt) { // only works when times are on same day
				var rect = coordinateGrid.rect(0, col, 0, col, slotContent); // only for horizontal coords
				var top = timePosition(startDate, startDate);
				var bottom = timePosition(startDate, endDate);
				if (bottom > top) { // protect against selections that are entirely before or after visible range
					rect.top = top;
					rect.height = bottom - top;
					rect.left += 2;
					rect.width -= 5;
					if ($.isFunction(helperOption)) {
						var helperRes = helperOption(startDate, endDate);
						if (helperRes) {
							rect.position = 'absolute';
							rect.zIndex = 8;
							selectionHelper = $(helperRes)
								.css(rect)
								.appendTo(slotContent);
						}
					}else{
						rect.isStart = true; // conside rect a "seg" now
						rect.isEnd = true;   //
						selectionHelper = $(slotSegHtml(
							{
								title: '',
								start: startDate,
								end: endDate,
								className: ['fc-select-helper'],
								editable: false
							},
							rect
						));
						selectionHelper.css('opacity', opt('dragOpacity'));
					}
					if (selectionHelper) {
						slotBind(selectionHelper);
						slotContent.append(selectionHelper);
						setOuterWidth(selectionHelper, rect.width, true); // needs to be after appended
						setOuterHeight(selectionHelper, rect.height, true);
					}
				}
			}
		}else{
			renderSlotOverlay(startDate, endDate);
		}
	}
	
	
	function clearSelection() {
		clearOverlays();
		if (selectionHelper) {
			selectionHelper.remove();
			selectionHelper = null;
		}
	}
	
	
	function slotSelectionMousedown(ev) {
		if (ev.which == 1 && opt('selectable')) { // ev.which==1 means left mouse button
			unselect(ev);
			var dates;
			hoverListener.start(function(cell, origCell) {
				clearSelection();
				if (cell && cell.col == origCell.col && !cellIsAllDay(cell)) {
					var d1 = cellDate(origCell);
					var d2 = cellDate(cell);
					dates = [
						d1,
						addMinutes(cloneDate(d1), opt('slotMinutes')),
						d2,
						addMinutes(cloneDate(d2), opt('slotMinutes'))
					].sort(cmp);
					renderSlotSelection(dates[0], dates[3]);
				}else{
					dates = null;
				}
			}, ev);
			$(document).one('mouseup', function(ev) {
				hoverListener.stop();
				if (dates) {
					if (+dates[0] == +dates[1]) {
						reportDayClick(dates[0], false, ev);
					}
					reportSelection(dates[0], dates[3], false, ev);
				}
			});
		}
	}
	
	
	function reportDayClick(date, allDay, ev) {
		trigger('dayClick', dayBodyCells[dayOfWeekCol(date.getDay())], date, allDay, ev);
	}
	
	
	
	/* External Dragging
	--------------------------------------------------------------------------------*/
	
	
	function dragStart(_dragElement, ev, ui) {
		hoverListener.start(function(cell) {
			clearOverlays();
			if (cell) {
				if (cellIsAllDay(cell)) {
					renderCellOverlay(cell.row, cell.col, cell.row, cell.col);
				}else{
					var d1 = cellDate(cell);
					var d2 = addMinutes(cloneDate(d1), opt('defaultEventMinutes'));
					renderSlotOverlay(d1, d2);
				}
			}
		}, ev);
	}
	
	
	function dragStop(_dragElement, ev, ui) {
		var cell = hoverListener.stop();
		clearOverlays();
		if (cell) {
			if(t.showStationen == true){
				var event = $(_dragElement).data("eventObject");
				if(event != undefined){
					event.station = t.getStationNameDelta(null, cell.col);
				}
			}
			trigger('drop', _dragElement, cellDate(cell), cellIsAllDay(cell), ev, ui);
		}
	}
	
	/**
	 * Returns the new Cabine-Name for the given delta.
	 */
	function getStationNameDelta(currentCabinName, delta){
		if(currentCabinName == undefined || currentCabinName == null){
			currentCabinName = t.calendar.options.stationen[0].name;
		}
		for(var i = 0; i< t.calendar.options.stationen.length; i++){
			if(currentCabinName === t.calendar.options.stationen[i].name){
				return t.calendar.options.stationen[i+delta].name;
			}
		}
	}


}
