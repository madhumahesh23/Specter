/// <reference path="jquery-1.11.3.min.js" />

var restURL = "http://<<specterproviderserviceurl>>/SpecterProviderService/ProviderService.asmx";
var _logQueries = true;
var reqType = "POST", JSONTYPE = "json",
fieldREGX = /{{\s*[\w\.]+\s*}}/g, //It is to match reference like "{{attributematches}}"
    CHART = "Chart",
    SLICER = "Slicer",
    RANGEPICKER = "RangePicker",
    DATASTUB = "Datastub",
    ACTION = {
        Slice: "SLICE",
        Render: "RENDER",
        Select: "SELECT"
    },
    isCtrlPressed = false, isShiftPressed = false,
    slicer_content_selected = 'slicer-content-selected';
var SPECCONSTANTS = {
    MONTHS: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
};

var defaultLoader = '<div class="loader-container" style="height:100% !important; padding-top:150px !important;"><i class="fa fa-circle-o-notch fa-spin fa-5x fa-fw"></i></div>';
var errorLoader = '<div class="loader-container loaderError" style="height:100% !important; padding-top:150px !important;"><i data-toggle="tooltip" data-trigger="manual" title="Sorry, something does not seem to be right here. We will be happy to fix if you could report this to EDWSupport@hfhs.org. Thank you for your patience." class="fa fa-exclamation-triangle fa-5x fa-fw"></i></div>';

function Specter() {
    this.Connections = [];
    this.Datasets = [];
    this.Relationships = [];
    //this.DataTables = [];
    this.Charts = [];
    this.Slicers = [];
    this.RangePickers = [];
    this.Filters = [];
    this.DataStubs = [];
    this.getChart = function (chartName) {
        try {
            var chart = findAndGetObj(this.Charts, "Name", chartName);
            return chart;
        }
        catch (err) {
            throw new Error(chartName + " not found!!");
        }
    }
    this.getSlicer = function (slicerName) {
        try {
            var slicer = findAndGetObj(this.Slicers, "Name", slicerName);
            return slicer;
        }
        catch (err) {
            throw new Error(slicerName + " not found!!");
        }
    }

    this.getRangePicker = function (rangePickerName) {
        try {
            var rangepicker = findAndGetObj(this.RangePickers, "Name", rangePickerName);
            return rangepicker;
        }
        catch (err) {
            throw new Error(rangePickerName + " not found!!");
        }
    }

    this.getDataStub = function (datastub) {
        try {
            var ds = findAndGetObj(this.DataStubs, "Name", datastub);
            return ds;
        }
        catch (err) {
            throw new Error(datastub + " not found!!");
        }
    }

    this.getParameterValue = function (param) {
        try {
            var v = findAndGetObj(this.Parameters, "Name", param);
            return v.Value;
        }
        catch (err) {
            throw new Error(param + " not found!!");
        }
    }

    this.UpdateFilter = function (filterItem) {
        try {

            var filter = findAndGetObj(this.Filters, "Name", filterItem.Name);
            var specter = this;
            var index = -1;

            if (specter.Filters.length > 0) {
                $.each(specter.Filters, function (i, filter) {
                    if (filter.Name == filterItem.Name) {
                        index = i;
                    }
                });

                if (index != -1) {
                    specter.Filters.splice(index, 1);
                }
                //if filterItem contains zero contents then remove it from specter.Filters
                if (filterItem.Contents.length > 0) {
                    specter.Filters.push(filterItem);
                }
                else {
                    specter.Filters.splice(index, 1);
                }
            }
            else {
                if (filterItem.Contents.length > 0)
                    specter.Filters.push(filterItem);
            }

            var event = {};
            event.Source = specter;
            event.Filters = specter.Filters;
            specter.onFiltersSelectionChange(event);
        }
        catch (err) {
            throw err;
        }
    }
    this.RemoveFilter = function (foritem) {
        try {
            var specter = this, index = -1;
            $.each(specter.Filters, function (i, filter) {
                if (filter.Name == foritem) {
                    index = i;
                }
            });

            if (index != -1) {
                specter.Filters.splice(index, 1);
            }

            // findAndRemove(specter.Filters, "Name", foritem);

            var event = {};
            event.Source = specter;
            event.Filters = specter.Filters;

            specter.onFiltersSelectionChange(event);
        }
        catch (err) {
            throw err;
        }
    }
}
$(document).on('keyup keydown', function (e) {
    isCtrlPressed = e.ctrlKey;
    isShiftPressed = e.shiftKey;
});
Specter.prototype.Load = function (specJson) {
    var thisSpecter = this;
    thisSpecter.Spec = $.extend(true, {}, specJson);
    thisSpecter.Name = specJson.Name;
    thisSpecter.Connections = [];
    thisSpecter.Datasets = [];
    thisSpecter.Relationships = [];
    thisSpecter.Charts = [];
    thisSpecter.Slicers = [];
    thisSpecter.RangePickers = [];
    thisSpecter.DataStubs = [];
    thisSpecter.onFiltersSelectionChange = specJson.onFiltersSelectionChange;
    thisSpecter.onLoad = specJson.onLoad;
    thisSpecter.Parameters = specJson.Parameters;
    //Load Connections
    $.each(specJson.Connections, function (i, con) {
        var c = new Connection();
        c.Name = con.Name;
        c.Server = con.Server;
        c.Database = con.Database;

        thisSpecter.Connections.push(c);
    });

    //load datasets
    $.each(specJson.Datasets, function (i, dataset) {
        var ds = new Dataset();
        ds.Name = dataset.Name;
        ds.Query = dataset.Query;
        ds.InMemory = dataset.InMemory;
        ds.Type = dataset.Type;
        ds.Table = dataset.Table;
        ds.ServiceUrl = dataset.ServiceUrl;
        if (isDefined(dataset.StoredProcedure)) {
            ds.StoredProcedure = dataset.StoredProcedure;
            //create dynamic table name to create temp table for stored proc execution -- WILL THINK ABOUT THIS LATER. FOR NOW I AM GOING TO USE TABLE VARIABLE

            ds.Table = '@' + dataset.Name;
        }
        ds.Connection = thisSpecter.getConnection(dataset.Connection);
        ds.Parent = thisSpecter;
        ds.Parameters = dataset.Parameters;
        ds.Columns = dataset.Columns;//getStoredProcColumns(ds);
        thisSpecter.Datasets.push(ds);
    });
    if (isDefined(specJson.Relationships)) {
        //load Relationships
        $.each(specJson.Relationships, function (i, relationship) {
            var rel = new Relationship();
            rel.Name = relationship.Name;
            rel.Dataset = thisSpecter.getDataset(relationship.Dataset);
            rel.Field = relationship.Field;
            rel.Join = isDefined(relationship.Join) ? relationship.Join : "Inner";
            rel.LookupDataset = thisSpecter.getDataset(relationship.LookupDataset);
            rel.LookupField = relationship.LookupField;

            thisSpecter.Relationships.push(rel);
        });
    }
    if (isDefined(specJson.DataStubs)) {
        //load datastubs
        $.each(specJson.DataStubs, function (i, datastub) {
            var dt = new DataStub();
            dt.Name = datastub.Name;
            dt.Fields = datastub.Fields;
            dt.QuerySet = datastub.QuerySet;
            dt.Parent = thisSpecter;
            dt.onLoad = datastub.onLoad;
            dt.Parameters = datastub.Parameters;
            thisSpecter.DataStubs.push(dt);
        });
    }
    if (isDefined(specJson.Charts)) {
        //load charts
        $.each(specJson.Charts, function (i, chart) {
            var c = new ChartProvider();
            c.Name = chart.Name;
            c.Provider = chart.Provider;
            c.CanRender = chart.CanRender;
            c.RenderTo = chart.RenderTo;
            c.Series = chart.Series; //U ll get ChartProvider instance from series.. on series click highcharts series will be assigned with Chartprovider instance
            c.SeriesCollection = chart.SeriesCollection;
            c.QuerySet = chart.QuerySet;
            c.Parent = thisSpecter;
            c.Datasets = chart.Datasets;
            c.CachedQuery = chart.CachedQuery;
            c.RenderOnLoad = chart.RenderOnLoad;
            c.Parameters = chart.Parameters;

            //c.DataTable = thisSpecter.getDataTable(chart.DataTable);
            c.Content = chart.Content;//getDefaultHighCharts("Colu");
            thisSpecter.Charts.push(c);
        });
    }
    if (isDefined(specJson.Slicers)) {
        if (isDefined(specJson.Slicers)) {
            //load Slicers
            $.each(specJson.Slicers, function (i, slicer) {
                var s = new Slicer();
                s.Name = slicer.Name;
                s.Text = slicer.Text;
                s.Value = slicer.Value;
                s.Fields = slicer.Fields;
                s.CanRender = slicer.CanRender;
                s.RenderTo = slicer.RenderTo;
                s.QuerySet = slicer.QuerySet;
                s.Heading = slicer.Heading;
                s.Multiselect = slicer.Multiselect;
                s.SelectAllByDefault = slicer.SelectAllByDefault;
                s.Parent = thisSpecter;
                s.Datasets = slicer.Datasets;
                s.CachedQuery = slicer.CachedQuery;
                s.RenderOnLoad = slicer.RenderOnLoad;
                s.Parameters = slicer.Parameters;
                s.LinkedItems = slicer.LinkedItems;
                s.Hidden = isDefined(slicer.Hidden) ? slicer.Hidden : false;
                s.onClear = slicer.onClear;
                s.onClick = slicer.onClick;
                thisSpecter.Slicers.push(s);
            });
        }
    }
    if (isDefined(specJson.RangePickers)) {
        $.each(specJson.RangePickers, function (i, rangepicker) {
            var s = new RangePicker();
            s.RenderOnLoad = rangepicker.RenderOnLoad;
            s.Name = rangepicker.Name;
            s.Fields = rangepicker.Fields;
            s.CanRender = rangepicker.CanRender;
            s.RenderTo = rangepicker.RenderTo;
            s.QuerySet = rangepicker.QuerySet;
            s.Heading = rangepicker.Heading;
            s.Parent = thisSpecter;
            s.Parameters = rangepicker.Parameters;
            s.LinkedItems = rangepicker.LinkedItems;
            s.Hidden = isDefined(rangepicker.Hidden) ? rangepicker.Hidden : false;
            s.onClear = rangepicker.onClear;
            s.onLoad = rangepicker.onLoad;
            s.Default = rangepicker.Default;
            s.RollingMonths= isDefined(rangepicker.RollingMonths) ? rangepicker.RollingMonths : 12;
            thisSpecter.RangePickers.push(s);
        });
    }
    if (isDefined(thisSpecter.onLoad)) {
        thisSpecter.onLoad();
    }
    //Log(thisSpecter);
}
Specter.prototype.getConnection = function (conName) {

    try {
        var con = findAndGetObj(this.Connections, "Name", conName);
        return con;
    }
    catch (err) {
        throw new Error(conName + " not found!!");
    }
}
Specter.prototype.getDataset = function (dsName) {

    try {
        var ds = findAndGetObj(this.Datasets, "Name", dsName);
        return ds;
    }
    catch (err) {
        throw new Error(dsName + " not found!!");
    }
}
Specter.prototype.getDataTable = function (dtName) {
    try {

        var dt = findAndGetObj(this.DataTables, "Name", dtName);
        return dt;
    }
    catch (err) {
        throw new Error(dtName + " not found!!");
    }
}
Specter.prototype.getRelationship = function (relName) {
    try {

        var rel = findAndGetObj(this.Relationships, "Name", relName);
        return rel;
    }
    catch (err) {
        throw new Error(relName + " not found!!");
    }
}
Specter.prototype.setParameter = function (parameter, value) {
    try {

        var prm = findAndGetObj(this.Parameters, "Name", parameter);
        if (isDefined(prm)) {
            prm.Value = value;
        }
    }
    catch (err) {
        throw new Error(parameter + " not found!!");
    }
}
Specter.prototype.Render = function () {
    var thisSpecter = this;
    // first set parameters if any before rendering any charts or slicers
    $.each(thisSpecter.Charts, function (i, chart) {
        if (chart.RenderOnLoad == true) {
            chart.Render();
        }
    });
    $.each(thisSpecter.Slicers, function (i, slicer) {
        if (slicer.RenderOnLoad == true) {
            slicer.Render();
        }
    });
    $.each(thisSpecter.RangePickers, function (i, rangepicker) {
        if (rangepicker.RenderOnLoad == true) {
            rangepicker.Render();
        }
    });
    $.each(thisSpecter.DataStubs, function (i, ds) {
        if (ds.RenderOnLoad == true) {
            ds.Render();
        }
    });
}

Specter.prototype.Reset = function () {
    // var news = new Specter();
    this.Load(this.Spec);
    // delete this;
    // return news;
}


function Connection() {
    this.Name;
    this.Server;
    this.Database;
    Object.defineProperty(this, "ConnectionString", {
        get: function () {
            return "Data Source=" + this.Server + ";Initial Catalog=" + this.Database + ";Integrated Security=SSPI;";;
        },
        enumerable: true
    });
}

function Dataset() {
    this.Name;
    this.Query;
    this.InMemory;
    this.Type;
    this.Connection;
}

function Relationship() {
    this.Name;
    this.Dataset;
    this.Field;
    this.LookupDataset;
    this.LookupField;
    Object.defineProperty(this, "Command", {
        get: function () {
            var dsName, dsLookupName;
            dsName = this.Dataset.Name;
            dsLookupName = this.LookupDataset.Name;

            return dsName + " inner join " + dsLookupName + " on " + dsName + "." + this.Field + "=" + dsLookupName + "." + this.LookupField;;
        },
        enumerable: true
    });
}

function ChartProvider() {
    this.Name;
    this.Provider;
    this.RenderTo;
    this.Series;
    this.SeriesCollection;
    this.Queryset;
    this.DataTable;
    this.CachedQuery;
    this.Parent;
}

ChartProvider.prototype.Render = function () {

    var thisChart = this;
    var thisSpecter = this.Parent;
    var $plotelement = $('#' + thisChart.RenderTo);
    $plotelement.empty().html(defaultLoader);

    try {
        $plotelement.highcharts().destroy();
    }
    catch (err)
    { }


    try {
        //throw new Error(); (for testing warning icon)
        var actualChart = thisChart.Content;
        if (isDefined(thisChart.QuerySet)) {
            //check to see if any service references are there
            var hasWebServiceRef = false;
            if (isDefined(thisChart.QuerySet.DatasetParams)) {
                $.each(thisChart.QuerySet.DatasetParams, function (i, dsParam) {
                    var dataset = findAndGetObj(thisSpecter.Datasets, "Name", dsParam.Dataset);
                    if (dataset.Type == "REST") {
                        // this function will retrun json object to be passed as parameter for REST service
                        var pJson = getRestDSParamsWithValue(dataset, thisChart);
                        //Log(pJson);
                        //Log(dataset.ServiceUrl);
                        try {
                            processRestSvcDataSet(dataset.ServiceUrl, pJson, function (response) { thisChart.PlotData(response); });
                        }
                        catch (err) {
                            Log(err)
                            $plotelement.empty().html(errorLoader);
                        }
                        hasWebServiceRef = true;
                    }
                });
            }
            if (hasWebServiceRef == false) {
                //send the queryset to provider service to get the result
                var q = getQuery(thisChart);
                if (_logQueries)
                    Log(q);
                // var starttime = new Date().getTime();
                //Log(starttime);
                $.ajax({
                    url: restURL + "/GetQuerySetResult",//,"/getQueryResult"
                    type: reqType,
                    //dataType: JSONTYPE,
                    data: { "query": q },
                    crossdomain: true,
                    xhrFields: {
                        withCredentials: true
                    },
                    success: function (response) {
                        //   response = JSON.parse(response);
                        // console.log(response);
                        // Log("Time taken:" + (new Date().getTime() - starttime));
                        try {
                            if (response.constructor === Array) {
                                if (response.length > 0) {
                                    thisChart.PlotData(response);
                                }
                                else {
                                    $plotelement.empty().html(errorLoader);
                                }
                            }
                            else {
                                $plotelement.empty().html(errorLoader);
                            }
                        }
                        catch (err) {
                            Log(err);
                            $plotelement.empty().html(errorLoader);
                        }
                    },
                    failure: function (xhr, status, err) {
                        Log(["failed :", xhr.responseText, err].join());
                        $plotelement.empty().html(errorLoader);
                    }
                });
            }

            //$.post(restURL + "/getQueryResult", { query: q }, function (data) { thisChart.PlotData(data); });

        }
    }
    catch (err) {
        $plotelement.empty().html(errorLoader);
    }
}

//}

ChartProvider.prototype.hide = function () {
    $('#' + this.RenderTo).hide();
}

ChartProvider.prototype.show = function () {
    $('#' + this.RenderTo).show();
}

ChartProvider.prototype.PlotData = function (data) {
    //Log(data);
    //first check this.Series and this.Series.Data
    var thisChart = this;
    var seriesCol = thisChart.SeriesCollection;
    var sCol = [];
    var seriesWithData = [];

    var jsn = JSON.stringify({ seriesCol: seriesCol, data: data });
    //prepare series collection and process data
    seriesCol.forEach(function (series) {
        var res;

        if (isDefined(series.Fields)) {
            res = drillRecords(series.Fields, data);
        }
        res.forEach(function (resultSet) {
            var s = {};

            for (var key in resultSet) {
                s[key] = resultSet[key];
            }

            for (var key in series) {
                //  console.log(key);
                var value = series[key];

                if (isString(value)) {
                    //get substr matching {{attrName}} - and extrach attrName from that
                    var matches = value.match(fieldREGX);
                    if (matches != null) {
                        var refCache = matches.map(function (x) {
                            return x.match(/[\w\.]+/)[0];
                        });
                        refCache.forEach(function (r) {
                            value = value.replace(fieldREGX, s[r]);
                        });
                    }
                }
                s[key] = value;
            }

            seriesWithData.push(s);
        });
    });
    //in this step process series.Data node for all the created series
    seriesWithData.forEach(function (series) {
        var acutalDataObj = [];
        var seriesData = series.data;
        var res;
        if (isDefined(seriesData.Fields)) {
            res = drillRecords(seriesData.Fields, series.$children);
        }

        res.forEach(function (resultSet) {
            var d = {};
            for (var key in resultSet) {
                d[key] = resultSet[key];
            }
            for (var key in seriesData) {
                var value = seriesData[key];
                if (isString(value)) {

                    //get substr matching {{attrName}} - and extract attrName from that
                    var matches = value.match(fieldREGX);
                    if (matches != null) {

                        $.each(matches, function (i, match) {
                            var ref = match.match(/[\w\.]+/)[0];
                            value = value.replace(match, d[ref]);
                            //refCache.forEach(function (r) {
                            //    value = value.replace(fieldREGX, d[r]);
                            //});
                        });
                    }

                    //if (matches != null) {
                    //    var refCache = value.match(fieldREGX).map(function (x) {
                    //        return x.match(/[\w\.]+/)[0];
                    //    });

                    //    refCache.forEach(function (r) {
                    //        value = value.replace(fieldREGX, d[r]);
                    //    });

                }
                var v = parseFloat(value);
                if (isNaN(v)) {
                    d[key] = value;
                }
                else {
                    d[key] = v;
                }
            }
            delete d.$children;
            // delete d.Fields;
            acutalDataObj.push(d);
        });

        series.data = acutalDataObj;

        if (thisChart.Content.chart.type == 'column' || thisChart.Content.chart.type == 'line') {
            if (series.data.length > 5) {
                thisChart.Content.xAxis.max = 5;

            } else if (series.data.length <= 5) {
                thisChart.Content.xAxis.max = series.data.length - 1;
            }
        }
        if (isDefined(series.preLoad)) {
            series.preLoad(series);
        }

        delete series.$children;
        //  delete series.Fields;
    });

    thisChart.Content.series = seriesWithData;
    seriesWithData.forEach(function (series) {
        series.ChartProvider = thisChart;
        series.Clear = onSeriesClear;
    });

    //at this point we have the Series ready
    var $renderElem = $('#' + thisChart.RenderTo);
    $renderElem.show();
    $renderElem.highcharts(thisChart.Content);
}

ChartProvider.prototype.setParameter = function (parameter, value) {
    try {

        var prm = findAndGetObj(this.Parameters, "Name", parameter);
        if (isDefined(prm)) {
            prm.Value = value;
        }
    }
    catch (err) {
        throw new Error(parameter + " not found!!");
    }
}
//"event" is from highcharts
function onSeriesPointClick(point, event) {
    if (isDefined(point)) {
        setTimeout(function () {

            var _series = point.series.options;
            var highchart = point.series.chart;
            var chart = _series.ChartProvider;
            var specter = chart.Parent;
            chart = specter.getChart(chart.Name);

            // when is the chart object updated? after this function finshes?
            var selectedPoints = highchart.getSelectedPoints();
            chart.Selected = [];

            if (selectedPoints.length == 0)
                _series.Clear();

            $.each(selectedPoints, function (i, p) {
                var item = {};
                //get Series fields values
                $.each(p.series.options.Fields, function (i, field) {
                    item[field] = _series[field] + '';
                });
                //get the point fields values
                $.each(p.Fields, function (i, field) {
                    item[field] = p[field] + '';
                });

                item["$seriesname"] = p.series.name;
                item["$series"] = p.series.options;
                item["$data"] = $.extend(true, {}, p);
                item["Value"] = p.name;
                chart.Selected.push(item);

                //chart.Selected.push({
                //    data: $.extend(true,{},p),
                //    series: p.series.name//.options//.name
                //});
            });
            //Log(chart.Selected);
            //onClick event is from chart json
            if (isDefined(_series.onClick)) {
                _series.onClick(event);
            }
            event.Source = chart;
            event.Selected = chart.Selected;
            //Log(chart.Selected);
            //charts filter selection for specter
            var filterItem = {
                Name: chart.Name,
                Type: CHART,
                Contents: chart.Selected,
                Source: _series
            };

            if (isDefined(_series.DrillItem)) {
                filterItem.DrillItem = _series.DrillItem;
                processDrillItem(_series.DrillItem, event);
            }

            var linkedItems = _series.LinkedItems;
            if (isDefined(linkedItems)) {
                $.each(linkedItems, function (i, item) {
                    processLinkedItem(item, event);
                });
            }

            specter.UpdateFilter(filterItem);

        }, 50);

        //if (point.state == "select")
        //{
        //    findAndRemove(chart.Selected, "Name", point.name);
        //}
        //else
        //{
        //    else {                
        //        chart.Selected.push({
        //            Name: point.name,
        //            Point: point//.name
        //        });
        //    }
        //}
        ////event.Specter = _series.Parent;
    }
}

function processDrillItem(item, event) {
    var $triggeredItem, thisSpecter, content;
    var selected = event.Selected; //if triggered item is chart event.Source will be SERIES of chart
    $triggeredItem = event.Source;
    thisSpecter = $triggeredItem.Parent;

    var chart = thisSpecter.getChart(item.Name);
    chart.CanRender = true;
    chart.RenderTo = $triggeredItem.RenderTo;
    $triggeredItem.InDrillMode = true;

    var regx = fieldREGX;
    if (isDefined(item.Parameters)) {
        $.each(item.Parameters, function (i, parameter) {
            var targetchartprm = findAndGetObj(chart.Parameters, "Name", parameter.Name);
            //if target parameter is available then add the value from source node to target parametes values attribute
            if (isDefined(targetchartprm)) {
                var value = parameter.Value;
                //parse the values attribute for {{<name>}} and get the <name> from "option" and assign it to target charts parameter values
                var matches = value.match(regx);
                if (matches != null) {
                    var refCache = matches.map(function (x) {
                        return x.match(/[\w\.]+/)[0];
                    });
                    var placetosearch, attrname;
                    targetchartprm.Value = [];

                    $.each(refCache, function (i, r) {
                        //example r will be series.Groupname or data.Groupname or just Groupname
                        var arr = r.split('.');
                        if (arr.length > 1) {
                            placetosearch = "$data";//if u give anything before attributename like  {{data.name}}.. consider it as $data by default...
                            attrname = arr[1];
                        }
                        else {
                            attrname = arr[0];
                        }

                        $.each(selected, function (index, selectedItem) {
                            if (event.SourceType == CHART) {
                                if (isDefined(placetosearch))
                                    selectedItem = selectedItem[placetosearch]; //placetosearch - either series/data
                                targetchartprm.Value.push(value.replace(regx, selectedItem[attrname]));
                            }
                            else if (event.SourceType == SLICER) {
                                targetchartprm.Value.push(value.replace(regx, selectedItem[attrname]));
                            }
                        });
                    });
                }
            }
        });
    }
    //at any cost parameters passing should be there. So, CanRender=false should not affect parameters passing.
    if (isUndefined(chart.CanRender) || chart.CanRender == true) {
        chart.Render();
    }
}

//"event" is from highcharts
function onChartLoad(event) {

    //get the chart instance first

    var highcharts = event.target;
    $.each(highcharts.series, function (i, s) {
        try {
            var specSeries = s.options;
            if (isDefined(specSeries.onLoad)) {
                specSeries.onLoad(s, event);
            }
            var chart = specSeries.ChartProvider;

            var spec = specSeries.ChartProvider.Parent;
            chart = spec.getChart(chart.Name);
            selected = chart.Selected;
            if (isDefined(selected)) {
                //.forEach(function (selectedPoint, index) {
                $.each(selected, function (i, item) {
                    if (item["$seriesname"] == s.name) {
                        var point = findAndGetObj(s.data, "name", item.Value);
                        if (isDefined(point))
                            point.select(true, true);
                    }
                });
                //var hasThisSeriesSelected = findAndGetObj(selected, "Series", s.name);
                //if (isDefined(hasThisSeriesSelected)) {
                //    point.select();
                //}
                // }); 
            }
        }
        catch (err)
        { }
    });
}

//triggered on series.Clear call
function onSeriesClear() {
    var $thisSeries = this;
    var $thisChart = $thisSeries.ChartProvider;
    var $thisSpecter = $thisChart.Parent;

    if (isDefined($thisSeries.onClear)) {
        $thisSeries.onClear();
    }

    $thisChart = $thisSpecter.getChart($thisChart.Name);
    delete $thisChart.Selected;
    $thisChart.InDrillMode = false;


    if (isDefined($thisSeries.DrillItem)) {
        //clear the drillitems Selected values 

        var drillChart = $thisSpecter.getChart($thisSeries.DrillItem.Name);
        drillChart.CanRender = false;
        if (isDefined(drillChart.Selected)) {
            var currSeries;
            $.each(drillChart.Selected, function (i, sItem) {
                if (currSeries != sItem.$series) {
                    currSeries = sItem.$series;
                    currSeries.Clear();
                }
            });
        }

        $thisSpecter.RemoveFilter($thisSeries.DrillItem.Name);
    }

    $thisChart.Render();
    $thisSpecter.RemoveFilter($thisChart.Name);

    $.each($thisSeries.LinkedItems, function (index, item) {
        switch (item.Type) {
            case "Chart":
                var chart = $thisSpecter.getChart(item.Name);
                if (item.Action == "SLICE") {
                    if (isDefined(item.Parameters)) {
                        $.each(item.Parameters, function (i, parameter) {
                            var targetchartprm = findAndGetObj(chart.Parameters, "Name", parameter.Name)
                            delete targetchartprm.Value;
                        });
                    }
                    if (isUndefined(chart.CanRender) || chart.CanRender == true) {
                        chart.Render();
                    }
                }
                else if (item.Action == "SELECT") {

                }
                else if (item.Action == "RENDER") {
                    if (isUndefined(chart.CanRender) || chart.CanRender == true) {
                        chart.Render();
                    }
                }

                break;
            case "Slicer":
                var slicer = $thisSpecter.getSlicer(item.Name);
                if (isUndefined(slicer.CanRender) || slicer.CanRender == true) {
                    if (item.Action == "SLICE") {
                        $.each(item.Parameters, function (i, parameter) {
                            var targetchartprm = findAndGetObj(slicer.Parameters, "Name", parameter.Name)
                            if (isDefined(targetchartprm))
                                delete targetchartprm.Value;
                        });
                        slicer.Render();
                    }
                    else if (item.Action == "SELECT") {
                        //since it is triggered by chart event will be undefined
                        slicer.Clear();
                    }
                }
                break;
            case "RangePicker":
                var range = $thisSpecter.getRangePicker(item.Name);
                if (isUndefined(range.CanRender) || range.CanRender == true) {
                    if (item.Action == "SLICE") {
                        $.each(item.Parameters, function (i, parameter) {
                            var targetchartprm = findAndGetObj(range.Parameters, "Name", parameter.Name)
                            if (isDefined(targetchartprm))
                                delete targetchartprm.Value;
                        });
                        range.Render();
                    }
                    else if (item.Action == "SELECT") {
                        //since it is triggered by chart event will be undefined
                        range.Clear();
                    }
                }
                break;
        }

    });
}

function Slicer() {
    this.Name;
    this.Fields = [];
    this.Selected = [];
    this.Text;
    this.Value;
    this.Heading;
    this.RenderTo; //if nothing specified will not be rendered at all
    this.RenderOnLoad = true;
    this.LinkedItems = [];
    this.QuerySet = [];

    $(this).on('slicer.on.clear', function (event) {
        event.Source = this;
        this.Clear(event);
    });
}

Slicer.prototype.Render = function () {
    var thisSlicer = this;


    var q = getQuery(thisSlicer);
    // Log(thisSlicer);
    if (_logQueries)
        Log(q);
    //format the result based on the series
    //var qSet = JSON.stringify(q);
    //Log(qSet);

    $.ajax({
        url: restURL + "/GetQuerySetResult",//"/getQueryResult",
        type: reqType,
        dataType: JSONTYPE,
        data: { "query": q },
        crossdomain: true,
        xhrFields: {
            withCredentials: true
        },
        success: function (response) {
            // response = JSON.parse(response);
            // console.log(response);

            thisSlicer.PlotData(response);
        },
        failure: function (xhr, status, err) {
            console.log(["failed :", xhr.responseText, err].join());
        }
    });

    //$.post(restURL + "/getQueryResult", { query: q }, function (data) { thisSlicer.PlotData(data); });
}

Slicer.prototype.PlotData = function (data) {
    var $thisSlicer = this;
    var regx = fieldREGX;///{{\s*[\w\.]+\s*}}/g
    var $plotelement = $('#' + $thisSlicer.RenderTo);

    var $content = $("<div class='slicer-content'>");
    // var $selectedContent = $("<div class='slicer-content'>");

    $thisSlicer.Content = [];
    if (isUndefined($thisSlicer.Multiselect)) {
        $thisSlicer.Multiselect = true;
    }
    $.each(data, function (index, row) {
        var content = {};
        content.Text = $thisSlicer.Text;
        content.Value = $thisSlicer.Value;

        $.each($thisSlicer.Fields, function (i, field) {
            content[field] = row[field];
        });

        //Log(content);
        //parse Text field
        //get substr matching {{attrName}} - and extract attrName from that
        var matches = content.Text.match(regx);
        if (matches != null) {
            var refCache = content.Text.match(regx).map(function (x) {
                return x.match(/[\w\.]+/)[0];
            });
            $.each(refCache, function (i, r) {
                content.Text = content.Text.replace(regx, row[r]);
            });
        }
        //parse Value field
        matches = content.Value.match(regx);
        if (matches != null) {
            var refCache = content.Value.match(regx).map(function (x) {
                return x.match(/[\w\.]+/)[0];
            });
            $.each(refCache, function (i, r) {
                content.Value = content.Value.replace(regx, row[r]);
            });
        }
        $thisSlicer.Content.push(content);
    });

    var selected = $thisSlicer.Selected, hasSelectedContent = false, foundSelectedContent = false;

    //hasSelectedContent - defines if there is any selected item in the current slicer
    //foundSelectedContent - defines if the user selected item found with in the slicer Contents
    //hasSelectedContent = true and foundSelectedContent = true -> Highlight only selected Content slicer item
    //hasSelectedContent = true and foundSelectedContent = false ->  Do not highlight any slicer item
    //hasSelectedContent = false ->  Highlight all slicer items (means nothing was selected on this slicer from user or slicer selection was cleared)


    //at this point we will have content with Text and Value fields populated. So render data to screen
    var radId = $thisSlicer.Heading + get4DigitUID();
    $.each($thisSlicer.Content, function (index, item) {
        var input = ""//, label="";
        //if multiselect is false then add radio button to slicer items
        if ($thisSlicer.Multiselect == false) {
            input = "<input type='radio' name='" + radId + "' value ='" + item.Value + "'>";
        }

        var $item = $("<div data-value='" + item.Value + "' class='content'>" + input + item.Text + "</div>");
        $item.data('Parent', $thisSlicer);
        //if there is any Selected items highlight those , if not hightlight all
        if (isDefined(selected) && selected.length > 0) {

            selected.forEach(function (selecteditem, index) {
                if (selecteditem.Text == item.Text && selecteditem.Value == item.Value) {
                    $item.addClass(slicer_content_selected);
                    foundSelectedContent = true;
                }
                //else {
                //    $content.append($item);
                //}
                $content.append($item);
            });
            //if hasSelectedContent is false at the end of all Contents processing do not add "slicer-content-selected" to all 
            hasSelectedContent = true;
        }
        else {
            $content.append($item);
        }

        $item.on('click', function (event) {
            onSlicerContentClick(event);
        });

    });

    $content.find('.' + slicer_content_selected).prependTo($content);

    //if there are no preselected contents then check if multiselect is false/true.. //if multiselect is false then select only first element and consider that as selected
    if (hasSelectedContent == false) {
        if ($thisSlicer.Multiselect == false) {
            $content.find('.content:first-child').addClass(slicer_content_selected);
        }
        else {
            $content.find('.content').addClass(slicer_content_selected);
        }
    }

    var $heading = $("<div class='heading'><span>" + $thisSlicer.Heading + "</span></div>");
    var $clear = $("<span class='slicer-clear'>x</span>");

    $clear.on('click', function (event) {
        $($thisSlicer).trigger('slicer.on.clear');
    });
    $heading.append($clear);

    ////if SelectAllByDefault is set to true the select all the sliceritems  
    //if (isDefined($thisSlicer.SelectAllByDefault)) {
    //    $content.children().each(function () {
    //        $(this).addClass(slicer_content_selected);
    //    });
    //}
    $plotelement.empty().append($heading)
        .append($content);

    $content.trigger('slicer.on.load');
}

Slicer.prototype.Select = function (value) {
    var $thisSlicer = this;
    var $plotElement = $('#' + $thisSlicer.RenderTo);

    $plotElement.find('.content').each(function (index, item) {
        item = $(item);
        //Log(content.Text + " " + item.text() + " " + content.Value + " " + item.data('value'))
        if (value == item.data('value')) {
            item.trigger("click");
        }
    });
}

Slicer.prototype.Clear = function (event) {
    var $thisSlicer = this;
    if (isDefined($thisSlicer.onClear)) {
        $thisSlicer.onClear(event);
    }
    var $thisSpecter = $thisSlicer.Parent;
    delete $thisSlicer.Selected;
    $.each($thisSlicer.LinkedItems, function (index, item) {
        switch (item.Type) {
            case "Chart":
                var chart = $thisSpecter.getChart(item.Name);
                if (item.Action == "SLICE") {
                    if (isDefined(item.Parameters)) {
                        $.each(item.Parameters, function (i, parameter) {
                            var targetchartprm = findAndGetObj(chart.Parameters, "Name", parameter.Name)
                            delete targetchartprm.Value;
                        });
                    }
                    if ((isUndefined(chart.CanRender) || chart.CanRender == true) && (isUndefined(chart.InDrillMode) || chart.InDrillMode == false)) {
                        chart.Render();
                    }
                }
                else if (item.Action == "SELECT") {

                }
                else if (item.Action == "RENDER") {
                    if ((isUndefined(chart.CanRender) || chart.CanRender == true) && (isUndefined(chart.InDrillMode) || chart.InDrillMode == false)) {
                        chart.Render();
                    }
                }

                break;
            case "Slicer":
                var slicer = $thisSpecter.getSlicer(item.Name);
                if (slicer.CanRender == true || !isDefined(slicer.CanRender)) {
                    if (item.Action == "SLICE") {
                        $.each(item.Parameters, function (i, parameter) {
                            var targetchartprm = findAndGetObj(slicer.Parameters, "Name", parameter.Name)
                            if (isDefined(targetchartprm))
                                delete targetchartprm.Value;
                        });
                        slicer.Render();
                    }
                }
                break;
            case "RangePicker":
                var range = $thisSpecter.getRangePicker(item.Name);
                if (isUndefined(range.CanRender) || range.CanRender == true) {
                    if (item.Action == "SLICE") {
                        $.each(item.Parameters, function (i, parameter) {
                            var targetchartprm = findAndGetObj(range.Parameters, "Name", parameter.Name)
                            if (isDefined(targetchartprm))
                                delete targetchartprm.Value;
                        });
                        range.Render();
                    }
                    else if (item.Action == "SELECT") {
                        //since it is triggered by chart event will be undefined
                        range.Clear();
                    }
                }
                break;
        }

    });

    $thisSlicer.Render();
    $thisSpecter.RemoveFilter($thisSlicer.Name);
}

Slicer.prototype.setParameter = function (parameter, value) {
    try {

        var prm = findAndGetObj(this.Parameters, "Name", parameter);
        if (isDefined(prm)) {
            prm.Value = value;
        }
    }
    catch (err) {
        throw new Error(parameter + " not found!!");
    }
}

function onSlicerContentClick(event) {
    var $e = $(event.target);
    var selectedObj = {
        Text: $e.text(),
        Value: $e.data('value')
    },
            $input = $e.children('input'),
            inputType = $input.prop('type'),
            slicer = $e.data('Parent');

    //u got the selected items value.. now get the actual selected Content item from slicer object

    $.each(slicer.Content, function (index, item) {
        if (selectedObj.Text == item.Text && selectedObj.Value == item.Value) {
            selectedObj = item;
        }
    });

    //if radio slicer is already selected and again if u tried to do ctrl+click the selection should not change.
    if (isCtrlPressed && inputType != 'radio') {
        if ($e.hasClass(slicer_content_selected)) {

            findAndRemove(slicer.Selected, "Value", selectedObj.Value);


            //if nothing is selected it means clear selection which inturn leads to ALL selection
            if (slicer.Selected.length == 0) {
                $e.siblings().addClass(slicer_content_selected);
                $e.siblings().children('input').prop("checked", false);
            }
            else {
                $e.removeClass(slicer_content_selected);
                $input.prop("checked", false);
            }
        }
        else {
            $e.addClass(slicer_content_selected);
            $input.prop("checked", true);
            slicer.Selected.push(selectedObj);
        }
    }
    else {
        // $input.prop("checked", !$input.prop('checked'));
        $e.addClass(slicer_content_selected);
        slicer.Selected = [];
        slicer.Selected.push(selectedObj)
        $input.prop("checked", true);
        $e.siblings().removeClass(slicer_content_selected);
    }

    var filterItem = {
        Name: slicer.Name,
        Type: SLICER,
        Contents: slicer.Selected,
        Source: slicer
    };
    slicer.Parent.UpdateFilter(filterItem);

    event.SourceType = SLICER;
    event.Source = slicer;
    event.Selected = slicer.Selected;
    //Log(slicer.Selected);
    if (isDefined(slicer.onClick)) {
        slicer.onClick(event);
    }
    //process linked items one by one
    $.each(slicer.LinkedItems, function (i, item) {
        processLinkedItem(item, event);
    });
}

function RangePicker() {

}

RangePicker.prototype.Render = function () {
    var thisRange = this;

    if (isDefined(thisRange.QuerySet)) {
        var q = getQuery(thisRange);        
        if (_logQueries)
            Log(q);

        $.ajax({
            url: restURL + "/GetQuerySetResult",//"/getQueryResult",
            type: reqType,
            dataType: JSONTYPE,
            data: { "query": q },
            crossdomain: true,
            xhrFields: {
                withCredentials: true
            },
            success: function (response) {
                // response = JSON.parse(response);
                // console.log(response);

                thisRange.PlotData(response);
            },
            failure: function (xhr, status, err) {
                console.log(["failed :", xhr.responseText, err].join());
            }
        });
    }
    //else {
    //    //If query set is not defined - consider ploting currentyear and lastyear
    //    var data = [];         
    //    var range = getRollingMonths(thisRange.RollingMonths, false);
    //    range = getAdjustedRange(range);
    //    thisRange.PlotData(data);
    //}
}

RangePicker.prototype.PlotData = function (data) {
    var $thisRange = this;
    var regx = fieldREGX;///{{\s*[\w\.]+\s*}}/g
    var today = new Date();
    var currYear = today.getFullYear();
    var $plotelement = $('#' + $thisRange.RenderTo);
    $plotelement.empty();

    var availableYears = [], isCurrYearAdded = false;
    $.each(data, function (i, row) {
        if (row.year == currYear)
            isCurrYearAdded = true;
        availableYears.push(row.year);
    });

    if (isCurrYearAdded == false) {
        availableYears.push(currYear);
    }

    var id = $thisRange.RenderTo + '_popover'; //get4DigitUID();
    var $picker = getCalendarDiv();
    var $clear = $("<i class='glyphicon glyphicon-remove slicer-clear' style='float:right;color:red' data-dismiss='popover'></i>");
    var $heading = $("<div class=heading>" + $thisRange.Heading + "</div>");
    var $content = $("<div class='mrp-monthdisplay'></div>");

    $thisRange.Years = availableYears;

    $picker.attr('id', id);
    $plotelement.append($heading)
    .append($content);

    $clear.on('click', function (e) {
        $thisRange.Clear();
        e.stopPropagation();
    });
    $heading.append($clear);

    if (isUndefined($thisRange.ClearTriggered) || $thisRange.ClearTriggered == false) {
        var endYear = Math.max.apply(Math, availableYears);
        var selectedRange = getRollingMonths($thisRange.RollingMonths, false);
        //if (endYear >= currYear) {
        //    selectedRange = getLast12Months(endYear, true); //get last 12 months from available end year                        
        //}
        //else {
        //    selectedRange = getLast12Months(endYear, false);
        //}
        selectedRange = getAdjustedRange(selectedRange);
        $thisRange.Selected = [];
        $thisRange.Selected.push(selectedRange);
    }

    //$plotelement.popover('destroy');

    $plotelement.popover({
        html: true,
        title: "<span>" + $thisRange.Heading + "</span><i class='glyphicon glyphicon-remove popover-close' style='float:right;color:red;cursor:pointer' data-dismiss='popover'></i>",
        placement: function (context, source) {
            $(context).addClass('mpr-rangepicker');
            var position = $(source).position();
            /*if (position.left < 280) {
                return "right";
            }
            if (position.top < 280) {
                return "bottom";
            }
            else {
                return "left";
            }*/
            return "left";
        },//'left',
        content: function () {
            //var pic = $picker.html();
           
            return $picker;
        },
        trigger: "manual"
    });

    $plotelement.unbind("click");
    $plotelement.on('click', function () {
        $plotelement.popover('toggle');
    });

    $plotelement.unbind('shown.bs.popover');
    $plotelement.on('shown.bs.popover', function () {
       
        var range = {};
        if (isDefined($thisRange.Selected)) {          
            var selectedRange = $thisRange.Selected[0];
            if (isDefined(selectedRange)) {
                range.StartMonth = selectedRange.StartMonth - 1;
                range.EndMonth = selectedRange.EndMonth - 1;
                range.StartYear = selectedRange.StartYear;
                range.EndYear = selectedRange.EndYear;
            }
        }

        $plotelement.data('bs.popover').tip().find('[data-dismiss="popover"]').on('click', function () {
            $plotelement.popover('hide');
        });

        var $p = $('#' + id);
        renderCalendar($thisRange, $plotelement, $p, availableYears, range);
        $p.unbind('monthrangepicker.on.select');
        $p.on('monthrangepicker.on.select', function (event, range) {
            var selected = getAdjustedRange(range);
            $plotelement.trigger('spectermpr.on.select', [selected]);
        });
    });

    $plotelement.unbind('hidden.bs.popover');
    $plotelement.on('hidden.bs.popover', function (e) {
        $(e.target).data("bs.popover").inState.click = false;
    });

    $plotelement.unbind('spectermpr.on.select');
    $plotelement.on('spectermpr.on.select', function (e, selected) {

        var event = {};
        event.Source = $thisRange;
        event.Selected = [];
        event.Selected.push(selected);
        event.SourceType = RANGEPICKER;

        $thisRange.Selected = event.Selected;

        var filterItem = {
            Name: $thisRange.Name,
            Type: RANGEPICKER,
            Contents: $thisRange.Selected,
            Source: $thisRange
        };

        $thisRange.Parent.UpdateFilter(filterItem);
        //process linked items one by one
        $.each($thisRange.LinkedItems, function (i, item) {
            processLinkedItem(item, event);
        });

        $(this).find('.mrp-monthdisplay').text(selected.StartMonthName + "-" + selected.StartYear + " to " + selected.EndMonthName + "-" + selected.EndYear);
    });


    if (isUndefined($thisRange.ClearTriggered) || $thisRange.ClearTriggered == false) {
        $plotelement.trigger('spectermpr.on.select', $thisRange.Selected);
    }
    if (isDefined($thisRange.onLoad)) {
        var e = {};
        e.Source = $thisRange;
        $thisRange.onLoad(e);
    }
}

RangePicker.prototype.Clear = function () {
    var $thisRange = this;
    $thisRange.ClearTriggered = true;
    if (isDefined($thisRange.onClear)) {
        $thisRange.onClear(event);
    }
    var $thisSpecter = $thisRange.Parent;
    delete $thisRange.Selected;
    $.each($thisRange.LinkedItems, function (index, item) {
        switch (item.Type) {
            case "Chart":
                var chart = $thisSpecter.getChart(item.Name);
                if (item.Action == "SLICE") {
                    if (isDefined(item.Parameters)) {
                        $.each(item.Parameters, function (i, parameter) {
                            var targetchartprm = findAndGetObj(chart.Parameters, "Name", parameter.Name)
                            delete targetchartprm.Value;
                        });
                    }
                    if ((isUndefined(chart.CanRender) || chart.CanRender == true) && (isUndefined(chart.InDrillMode) || chart.InDrillMode == false)) {
                        chart.Render();
                    }
                }
                else if (item.Action == "SELECT") {

                }
                else if (item.Action == "RENDER") {
                    if ((isUndefined(chart.CanRender) || chart.CanRender == true) && (isUndefined(chart.InDrillMode) || chart.InDrillMode == false)) {
                        chart.Render();
                    }
                }

                break;
            case "Slicer":
                var slicer = $thisSpecter.getSlicer(item.Name);
                if (slicer.CanRender == true || !isDefined(slicer.CanRender)) {
                    if (item.Action == "SLICE") {
                        $.each(item.Parameters, function (i, parameter) {
                            var targetchartprm = findAndGetObj(slicer.Parameters, "Name", parameter.Name)
                            if (isDefined(targetchartprm))
                                delete targetchartprm.Value;
                        });
                        slicer.Render();
                    }
                }
                break;
        }

    });

    $thisRange.Render();
    var $plotelement = $('#' + $thisRange.RenderTo);
    $plotelement.popover('hide');
    $thisSpecter.RemoveFilter($thisRange.Name);
}

RangePicker.prototype.setParameter = function (parameter, value) {
    try {
        var prm = findAndGetObj(this.Parameters, "Name", parameter);
        if (isDefined(prm)) {
            prm.Value = value;
        }
    }
    catch (err) {
        throw new Error(parameter + " not found!!");
    }
}

function getAdjustedRange(range) {
    var s = {};
    s.StartYear = range.StartYear;
    s.EndYear = range.EndYear;
    s.StartMonthName = SPECCONSTANTS.MONTHS[range.StartMonth];
    s.StartMonth = range.StartMonth + 1;
    s.EndMonthName = SPECCONSTANTS.MONTHS[range.EndMonth];
    s.EndMonth = range.EndMonth + 1;
    s.StartDate = s.StartMonth + '-01-' + s.StartYear;
    s.EndDate = s.EndMonth + '-01-' + s.EndYear;
    s.Value = s.StartMonthName + " " + s.StartYear + " To " + s.EndMonthName + " " + s.EndYear;
    return s;
}

function renderCalendar($range, $plotelement, $picker, availableYears, selectedRange) {
    var currentViewRange, today = new Date();
    var currYear = today.getFullYear();
    var endYear = Math.max.apply(Math, availableYears);
    var startYear = Math.min.apply(Math, availableYears);

    var availableRange = {
        StartYear: startYear,
        EndYear: endYear
    };

    var $calendar = $picker;
    $calendar.data('startyear', startYear);
    $calendar.data('endYear', endYear);

    var $cldr1 = $calendar.find('.month-picker-1'),
        $cldr2 = $calendar.find('.month-picker-2');
    var $rightnav = $cldr2.find('.mpr-yearup'),
     $leftnav = $cldr1.find('.mpr-yeardown');

    if (isDefined(availableRange)) {
        //if any field of selected range is undefined then reset to last 12 months
        //if (isUndefined(selectedRange.StartYear) && isUndefined(selectedRange.EndYear) &&
        //    isUndefined(selectedRange.StartMonth) && isUndefined(selectedRange.EndMonth)) {
        //    //reset calendar to last 12 months
        //    if (availableRange.EndYear >= currYear) {
        //        selectedRange = getLast12Months(availableRange.EndYear, true); //get last 12 months from available end year
        //        $calendar.trigger('monthrangepicker.on.select', [selectedRange]);
        //    }
        //    else {
        //        selectedRange = getLast12Months(availableRange.EndYear, false);
        //        $calendar.trigger('monthrangepicker.on.select', [selectedRange]);
        //    }
        //}
        //else {
        //    //check if selectedRange is greater than availableRange reset the calendar control to have last 12 months selected
        //    if (selectedRange.StartYear > availableRange.EndYear ||
        //        selectedRange.EndYear > availableRange.EndYear) {
        //        //reset calendar to last 12 months
        //        if (availableRange.EndYear >= currYear) {
        //            selectedRange = getLast12Months(availableRange.EndYear, true); //get last 12 months from available end year
        //            $calendar.trigger('monthrangepicker.on.select', [selectedRange]);
        //        }
        //        else {
        //            selectedRange = getLast12Months(availableRange.EndYear, false);
        //            $calendar.trigger('monthrangepicker.on.select', [selectedRange]);
        //        }
        //    }
        //    else {
        //        //render calendar with current selectedRange applied
        //    }
        //}

        $cldr2.data('year', endYear);
        $cldr2.find('.mpr-month').data('year', endYear);
        $cldr2.find('.month-picker-header-yr').text(endYear);

        $cldr1.data('year', endYear - 1);
        $cldr1.find('.month-picker-header-yr').text(endYear - 1);
        $cldr1.find('.mpr-month').data('year', endYear - 1);
    }

    $leftnav.unbind('click');
    $leftnav.on('click', function (event) {

        var plotedYear1 = $cldr1.data('year');
        var plotedYear2 = $cldr2.data('year');



        if (availableRange.StartYear < plotedYear1) {
            $cldr1.data('year', plotedYear1 - 1);
            $cldr1.find('.month-picker-header-yr').text(plotedYear1 - 1);

            $cldr1.find('.mpr-month').data('year', plotedYear1 - 1);

            $cldr2.data('year', plotedYear2 - 1);
            $cldr2.find('.month-picker-header-yr').text(plotedYear2 - 1);
            $cldr2.find('.mpr-month').data('year', plotedYear2 - 1);
        }
        redrawMonths($calendar, selectedRange);
    });

    $rightnav.unbind('click');
    $rightnav.on('click', function (event) {

        var plotedYear1 = $cldr1.data('year');
        var plotedYear2 = $cldr2.data('year');

        if (availableRange.EndYear > plotedYear2) {
            $cldr1.data('year', plotedYear1 + 1);
            $cldr1.find('.month-picker-header-yr').text(plotedYear1 + 1);
            $cldr1.find('.mpr-month').data('year', plotedYear1 + 1);

            $cldr2.data('year', plotedYear2 + 1);
            $cldr2.find('.month-picker-header-yr').text(plotedYear2 + 1);
            $cldr2.find('.mpr-month').data('year', plotedYear2 + 1);
        }
        redrawMonths($calendar, selectedRange);
    });

    $calendar.unbind('click');
    $calendar.on('click', '.mpr-month', function () {

        var $mnth = $(this);
        var currSelectedMonth = parseInt($mnth.data('month')),
        currSelectedYear = $mnth.data('year');

        var currYearMonth = currSelectedYear * 100 + currSelectedMonth;

        //if StartMonth is not there then current selection is the StartMonth
        if (isUndefined(selectedRange.StartMonth)) {
            selectedRange.StartMonth = currSelectedMonth;
            selectedRange.StartYear = currSelectedYear;
            delete selectedRange.EndMonth;
            delete selectedRange.EndYear;
            $calendar.find('.mpr-month').removeClass('mpr-month-rangemarker');
            $calendar.find('.mpr-month').removeClass('mpr-selected-start');
            $calendar.find('.mpr-month').removeClass('mpr-selected-end');
            $mnth.addClass('mpr-selected-start');
        }
        else {
            //if StartMonth was already selected buth EndMonth was not selected then 
            if (isUndefined(selectedRange.EndMonth) || isUndefined(selectedRange.EndYear)) {
                if (currSelectedYear == selectedRange.StartYear) {
                    if (currSelectedMonth > selectedRange.StartMonth) {
                        selectedRange.EndMonth = currSelectedMonth;
                        selectedRange.EndYear = currSelectedYear;
                        $mnth.addClass('mpr-selected-end');
                        $calendar.trigger('monthrangepicker.on.select', [selectedRange]);
                        //Log(selectedRange);
                    }

                    else if (currSelectedMonth < selectedRange.StartMonth) {
                        selectedRange.StartMonth = currSelectedMonth;
                        selectedRange.StartYear = currSelectedYear;
                        delete selectedRange.EndMonth;
                        delete selectedRange.EndYear;
                        $calendar.find('.mpr-month').removeClass('mpr-month-rangemarker');
                        $calendar.find('.mpr-month').removeClass('mpr-selected-start');
                        $calendar.find('.mpr-month').removeClass('mpr-selected-end');
                        $mnth.addClass('mpr-selected-start');
                    }
                }
                else if (currSelectedYear > selectedRange.StartYear) {
                    selectedRange.EndMonth = currSelectedMonth;
                    selectedRange.EndYear = currSelectedYear;
                    $mnth.addClass('mpr-selected-end');
                    $calendar.trigger('monthrangepicker.on.select', [selectedRange]);
                    //Log(selectedRange);
                }
                else if (currSelectedYear < selectedRange.StartYear) {
                    selectedRange.StartMonth = currSelectedMonth;
                    selectedRange.StartYear = currSelectedYear;
                    delete selectedRange.EndMonth;
                    delete selectedRange.EndYear;
                    $calendar.find('.mpr-month').removeClass('mpr-month-rangemarker');
                    $calendar.find('.mpr-month').removeClass('mpr-selected-start');
                    $calendar.find('.mpr-month').removeClass('mpr-selected-end');
                    $mnth.addClass('mpr-selected-start');
                }
            }
            else //if StartMonth and EndMonth range is already selected - then clear the already selected range and consider current selection as StartMonth                    
            {
                selectedRange.StartMonth = currSelectedMonth;
                selectedRange.StartYear = currSelectedYear;
                delete selectedRange.EndMonth;
                delete selectedRange.EndYear;
                $calendar.find('.mpr-month').removeClass('mpr-month-rangemarker');
                $calendar.find('.mpr-month').removeClass('mpr-selected-start');
                $calendar.find('.mpr-month').removeClass('mpr-selected-end');
                $mnth.addClass('mpr-selected-start');
            }
        }
        selectedRange.StartMonth = parseInt(selectedRange.StartMonth);
        selectedRange.StartMonthName = SPECCONSTANTS.MONTHS[selectedRange.StartMonth];
        selectedRange.EndMonth = parseInt(selectedRange.EndMonth);
        selectedRange.EndMonthName = SPECCONSTANTS.MONTHS[selectedRange.EndMonth];
    });

    $calendar.unbind('mouseover');
    $calendar.on('mouseover', '.mpr-month', function () {
        if (isDefined(selectedRange)) {
            if (isUndefined(selectedRange.EndYear) || isUndefined(selectedRange.EndMonth)) {
                var $mnth = $(this);

                var endYear = $mnth.data('year'),
                    endMonth = $mnth.data('month');


                if (isEndRangeValid(selectedRange, endYear, endMonth)) {
                    // $mnth.addClass('mpr-month-rangemarker');
                    markRange($calendar, selectedRange.StartYear, selectedRange.StartMonth, endYear, endMonth)
                }
                else {
                    $calendar.find('.mpr-month').removeClass('mpr-month-rangemarker');
                }
            }
        }
    });
    redrawMonths($calendar, selectedRange);
}

function redrawMonths($calendar, selectedRange) {
    $calendar.find('.mpr-month').removeClass('mpr-month-rangemarker');
    $calendar.find('.mpr-month').removeClass('mpr-selected-start');
    $calendar.find('.mpr-month').removeClass('mpr-selected-end');
    if (isDefined(selectedRange)) {
        $calendar.find('.mpr-month').each(function () {
            var $mnth = $(this);

            var month = $mnth.data('month');
            var year = $mnth.data('year');

            if (selectedRange.StartYear == year && selectedRange.StartMonth == month) {
                $mnth.addClass('mpr-selected-start');
            }
            else if (selectedRange.EndYear == year && selectedRange.EndMonth == month) {
                $mnth.addClass('mpr-selected-end');
            }
        });
        markRange($calendar, selectedRange.StartYear, selectedRange.StartMonth, selectedRange.EndYear, selectedRange.EndMonth);
    }
}

function isEndRangeValid(selectedRange, endYear, endMonth) {
    var selectedStartYear = selectedRange.StartYear,
        selectedStartMonth = selectedRange.StartMonth;

    //  Log(selectedStartYear + '-'+ selectedStartMonth +'-'+endYear + '-'+endMonth);

    if (endYear > selectedStartYear) {
        return true;
    }
    else if (endYear == selectedStartYear && endMonth > selectedStartMonth) {
        return true;
    }
    else return false;
}

function markRange($calendar, startYear, startMonth, endYear, endMonth) {

    $calendar.find('.mpr-month').removeClass('mpr-month-rangemarker');

    $calendar.find('.mpr-month').each(function () {
        var $mnth = $(this);
        var year = $mnth.data('year'),
            month = $mnth.data('month');
        //var adjustedNumber = year*100 + month;
        if (year >= startYear && year <= endYear) {
            if ((year == startYear && month > startMonth && month <= endMonth)) {
                $mnth.addClass('mpr-month-rangemarker');
            }
            else if (year < endYear && month > startMonth && month <= 12) {
                $mnth.addClass('mpr-month-rangemarker');
            }
            else if (year > startYear && (year <= endYear && month <= endMonth)) {
                $mnth.addClass('mpr-month-rangemarker');
            }
            else if (year > startYear && year < endYear) {
                $mnth.addClass('mpr-month-rangemarker');
            }
        }
    });
}

function onRangeSelect($plotelement, range) {

}

function getMonthIndex(monthName) {

    var month = monthName.substring(0, 3);//get first 3 characters 

    return SPECCONSTANTS.MONTHS.indexOf(month) + 1;
}

function getLast12Months(fromYear, considerCurrentYear) {
    var today = new Date();

    var aMonth = today.getMonth() - 1;
    if (considerCurrentYear == false) {
        aMonth = 11;//december
    }
    var year = fromYear;
    var range = {}, i;

    range.EndYear = fromYear;
    range.EndMonth = aMonth;
    range.EndMonthName = SPECCONSTANTS.MONTHS[aMonth];

    for (i = 0; i < 12; i++) {
        range.StartYear = year;
        range.StartMonth = aMonth;
        range.StartMonthName = SPECCONSTANTS.MONTHS[aMonth];
        aMonth--;
        if (aMonth < 0) {
            aMonth = 11;
            year = fromYear - 1;
        }
    }
    return range;
}

//monthCount - number of rolling months to consider
function getRollingMonths(monthCount, considerCurrentMonth)
{
    var today = new Date();
    var currMonth = today.getMonth();
    if (considerCurrentMonth == false) {
        currMonth = today.getMonth() - 1;
    }

    var currYear = today.getFullYear();
    var range = {}, i;

    range.EndYear = currYear;
    range.EndMonth = currMonth;
    range.EndMonthName = SPECCONSTANTS.MONTHS[currMonth];
    for (i = 0; i < monthCount; i++) {
        range.StartYear = currYear;
        range.StartMonth = currMonth;
        range.StartMonthName = SPECCONSTANTS.MONTHS[currMonth];
        currMonth--;
        if (currMonth < 0) {
            currMonth = 11;
            currYear = currYear - 1;
        }
    }

    return range;
}

function DataStub() {
    this.Name;
    this.Fields = [];
    this.RenderOnLoad = true;
    this.QuerySet = [];
    this.CanRender = true;
}

DataStub.prototype.Clear = function () {

}
DataStub.prototype.setParameter = function (parameter, value) {
    try {
        var prm = findAndGetObj(this.Parameters, "Name", parameter);
        if (isDefined(prm)) {
            prm.Value = value;
        }
    }
    catch (err) {
        throw new Error(parameter + " not found!!");
    }
}
DataStub.prototype.Render = function () {
    var thisDatastub = this;


    var q = getQuery(thisDatastub);
    // Log(thisSlicer);
    if (_logQueries)
        Log(q);
    //format the result based on the series
    //var qSet = JSON.stringify(q);
    //Log(qSet);

    $.ajax({
        url: restURL + "/GetQuerySetResult",//"/getQueryResult",
        type: reqType,
        dataType: JSONTYPE,
        data: { "query": q },
        crossdomain: true,
        xhrFields: {
            withCredentials: true
        },
        success: function (response) {
            // response = JSON.parse(response);
            // console.log(response);

            thisDatastub.PlotData(response);
        },
        failure: function (xhr, status, err) {
            console.log(["failed :", xhr.responseText, err].join());
        }
    });
}
DataStub.prototype.PlotData = function (data) {
    var thisDataStub = this;
    var event = {};
    event.data = data;
    event.Source = thisDataStub;
    if (isDefined(thisDataStub.onLoad)) {
        thisDataStub.onLoad(event);
    }
}
//options will give series and point information from chart
function processLinkedItem(item, event) {
    var $triggeredItem, thisSpecter, content;
    //if triggered item is SLICER then event.Source will be SLICER itself
    var selected = event.Selected; //if triggered item is chart event.Source will be SERIES of chart
    $triggeredItem = event.Source;
    thisSpecter = $triggeredItem.Parent;

    //if (event.SourceType == CHART) {
    //    thisSpecter = $triggeredItem.ChartProvider.Parent;
    //}
    //else if (event.SourceType == SLICER) {
    //    $triggeredItem = event.Source;
    //   // source = $triggeredItem.Selected;//event.Selected; //will have array of Text and Value attribute
    //}


    //get the Specter and Chart instance
    //datapoint is valid only if the event is from chart, if action is from slicer datapoint will be undefined
    var dataPoint = event.point;
    var regx = fieldREGX;///{{\s*[\w\.]+\s*}}/g
    switch (item.Type) {
        case CHART:
            var chart = thisSpecter.getChart(item.Name);
            if (item.Action == ACTION.Slice) {
                //prepare the parameters to pass
                if (isDefined(item.Parameters)) {
                    $.each(item.Parameters, function (i, parameter) {
                        var targetchartprm = findAndGetObj(chart.Parameters, "Name", parameter.Name)
                        //if target parameter is available then add the value from source node to target parametes values attribute
                        if (isDefined(targetchartprm)) {
                            var value = parameter.Value;
                            //parse the values attribute for {{<name>}} and get the <name> from "option" and assign it to target charts parameter values
                            var matches = value.match(regx);
                            if (matches != null) {
                                var refCache = matches.map(function (x) {
                                    return x.match(/[\w\.]+/)[0];
                                });
                                var placetosearch, attrname;
                                targetchartprm.Value = [];

                                $.each(refCache, function (i, r) {
                                    //example r will be series.Groupname or data.Groupname or just Groupname
                                    var arr = r.split('.');
                                    if (arr.length > 1) {
                                        placetosearch = "$data";//if u give anything before attributename like  {{data.name}}.. consider it as $data by default...
                                        attrname = arr[1];
                                    }
                                    else {
                                        attrname = arr[0];
                                    }

                                    $.each(selected, function (index, selectedItem) {
                                        if (event.SourceType == CHART) {
                                            if (isDefined(placetosearch))
                                                selectedItem = selectedItem[placetosearch]; //placetosearch - either series/data
                                            targetchartprm.Value.push(value.replace(regx, selectedItem[attrname]));
                                        }
                                        else if (event.SourceType == SLICER || event.SourceType == RANGEPICKER) {
                                            targetchartprm.Value.push(value.replace(regx, selectedItem[attrname]));
                                        }
                                    });
                                });
                            }
                        }
                    });
                }
                //at any cost parameters passing should be there. So, CanRender=false should not affect parameters passing.
                //InDrillMode means currently chart has been drilledown to its DrillItem so if InDrillMode = true then dont render current chart
                if ((isUndefined(chart.CanRender) || chart.CanRender == true) && (isUndefined(chart.InDrillMode) || chart.InDrillMode == false)) {
                    chart.Render();
                }
            }
            else if (item.Action == ACTION.Select) {
            }
            else if (item.Action == ACTION.Render) {
                //at any cost parameters passing should be there. So, CanRender=false should not affect parameters passing.
                //InDrillMode means currently chart has been drilledown to its DrillItem so if InDrillMode = true then dont render current chart
                if ((isUndefined(chart.CanRender) || chart.CanRender == true) && (isUndefined(chart.InDrillMode) || chart.InDrillMode == false)) {
                    chart.Render();
                }
            }

            break;
        case SLICER:
            var slicer = thisSpecter.getSlicer(item.Name);
            if (item.Action == ACTION.Slice) {
                //prepare the parameters to pass
                if (isDefined(item.Parameters)) {
                    $.each(item.Parameters, function (i, parameter) {
                        var targetchartprm = findAndGetObj(slicer.Parameters, "Name", parameter.Name);
                        //if target parameter is available then add the value from source node to target parametes values attribute
                        if (isDefined(targetchartprm)) {
                            var value = parameter.Value;
                            //parse the values attribute for {{<name>}} and get the <name> from "option" and assign it to target charts parameter values
                            var matches = value.match(regx);
                            if (matches != null) {
                                var refCache = matches.map(function (x) {
                                    return x.match(/[\w\.]+/)[0];
                                });
                                var placetosearch, attrname;
                                targetchartprm.Value = [];
                                $.each(refCache, function (i, r) {
                                    //example r will be series.Groupname or data.Groupname or just Groupname
                                    var arr = r.split('.');
                                    if (arr.length > 1) {
                                        placetosearch = "$data";
                                        attrname = arr[1];
                                    }
                                    else {
                                        attrname = arr[0];
                                    }
                                    //Log(event.point);

                                    // var loc = placetosearch.toLowerCase() == "root" ? source : dataPoint;
                                    $.each(selected, function (index, selectedItem) {

                                        if (event.SourceType == CHART) {
                                            if (isDefined(placetosearch))
                                                selectedItem = selectedItem[placetosearch]; //placetosearch - either series/data
                                            targetchartprm.Value.push(value.replace(regx, selectedItem[attrname]));
                                        }
                                        else if (event.SourceType == SLICER || event.SourceType == RANGEPICKER) {
                                            targetchartprm.Value.push(value.replace(regx, selectedItem[attrname]));
                                        }
                                    });
                                });
                            }
                        }
                    });
                }
                //at any cost parameters passing should be there. So, CanRender=false should not affect parameters passing.
                if (isUndefined(slicer.CanRender) || slicer.CanRender == true) {
                    slicer.Render();
                }
            }
            else if (item.Action == ACTION.Select) {
                //not sure if we need to call Slicer.Select if CanRender is false on the Slicer object.
                if (isUndefined(slicer.CanRender) || slicer.CanRender == true) {
                    var value;
                    var matches = item.Value.match(regx);
                    if (matches != null) {
                        var refCache = matches.map(function (x) {
                            return x.match(/[\w\.]+/)[0];
                        });
                        var placetosearch, attrname;
                        $.each(refCache, function (i, r) {
                            //example r will be series.Groupname or data.Groupname or just Groupname
                            var arr = r.split('.');
                            if (arr.length > 1) {
                                placetosearch = "$data";
                                attrname = arr[1];
                            }
                            else {
                                attrname = arr[0];
                            }
                            //Log(event.point);

                            var loc = placetosearch.toLowerCase() == "root" ? source : dataPoint;
                            value = item.Value.replace(regx, loc[attrname]);
                        });
                    }
                    slicer.Select(value);
                }
            }
            else if (item.Action == ACTION.Render) {
                //at any cost parameters passing should be there. So, CanRender=false should not affect parameters passing.
                if (isUndefined(slicer.CanRender) || slicer.CanRender == true) {
                    slicer.Render();
                }
            }
            break;
        case RANGEPICKER:
            var rangepicker = thisSpecter.getRangePicker(item.Name);
            if (item.Action == ACTION.Slice) {
                //prepare the parameters to pass
                if (isDefined(item.Parameters)) {
                    $.each(item.Parameters, function (i, parameter) {
                        var targetprm = findAndGetObj(rangepicker.Parameters, "Name", parameter.Name);
                        //if target parameter is available then add the value from source node to target parametes values attribute
                        if (isDefined(targetprm)) {
                            var value = parameter.Value;
                            //parse the values attribute for {{<name>}} and get the <name> from "option" and assign it to target charts parameter values
                            var matches = value.match(regx);
                            if (matches != null) {
                                var refCache = matches.map(function (x) {
                                    return x.match(/[\w\.]+/)[0];
                                });
                                var placetosearch, attrname;
                                targetprm.Value = [];
                                $.each(refCache, function (i, r) {
                                    //example r will be series.Groupname or data.Groupname or just Groupname
                                    var arr = r.split('.');
                                    if (arr.length > 1) {
                                        placetosearch = "$data";
                                        attrname = arr[1];
                                    }
                                    else {
                                        attrname = arr[0];
                                    }
                                    //Log(event.point);

                                    // var loc = placetosearch.toLowerCase() == "root" ? source : dataPoint;
                                    $.each(selected, function (index, selectedItem) {

                                        if (event.SourceType == CHART) {
                                            if (isDefined(placetosearch))
                                                selectedItem = selectedItem[placetosearch]; //placetosearch - either series/data
                                            targetprm.Value.push(value.replace(regx, selectedItem[attrname]));
                                        }
                                        else if (event.SourceType == SLICER || event.SourceType == RANGEPICKER) {
                                            targetprm.Value.push(value.replace(regx, selectedItem[attrname]));
                                        }
                                    });
                                });
                            }
                        }
                    });
                }
                //at any cost parameters passing should be there. So, CanRender=false should not affect parameters passing.
                if (isUndefined(rangepicker.CanRender) || rangepicker.CanRender == true) {
                    rangepicker.Render();
                }
            }
            break;
        case DATASTUB:
            var datastub = thisSpecter.getDataStub(item.Name);
            if (item.Action == ACTION.Slice) {
                //prepare the parameters to pass
                if (isDefined(item.Parameters)) {
                    $.each(item.Parameters, function (i, parameter) {
                        var targetprm = findAndGetObj(datastub.Parameters, "Name", parameter.Name);
                        //if target parameter is available then add the value from source node to target parametes values attribute
                        if (isDefined(targetprm)) {
                            var value = parameter.Value;
                            //parse the values attribute for {{<name>}} and get the <name> from "option" and assign it to target charts parameter values
                            var matches = value.match(regx);
                            if (matches != null) {
                                var refCache = matches.map(function (x) {
                                    return x.match(/[\w\.]+/)[0];
                                });
                                var placetosearch, attrname;
                                targetprm.Value = [];
                                $.each(refCache, function (i, r) {
                                    //example r will be series.Groupname or data.Groupname or just Groupname
                                    var arr = r.split('.');
                                    if (arr.length > 1) {
                                        placetosearch = "$data";
                                        attrname = arr[1];
                                    }
                                    else {
                                        attrname = arr[0];
                                    }
                                    //Log(event.point);

                                    // var loc = placetosearch.toLowerCase() == "root" ? source : dataPoint;
                                    $.each(selected, function (index, selectedItem) {

                                        if (event.SourceType == CHART) {
                                            if (isDefined(placetosearch))
                                                selectedItem = selectedItem[placetosearch]; //placetosearch - either series/data
                                            targetprm.Value.push(value.replace(regx, selectedItem[attrname]));
                                        }
                                        else if (event.SourceType == SLICER || event.SourceType == RANGEPICKER) {
                                            targetprm.Value.push(value.replace(regx, selectedItem[attrname]));
                                        }
                                    });
                                });
                            }
                        }
                    });
                }
                //at any cost parameters passing should be there. So, CanRender=false should not affect parameters passing.
                if (isUndefined(datastub.CanRender) || datastub.CanRender == true) {
                    datastub.Render();
                }
            }
            break;
    }
}

function getQuery($this) {
    var query, wherecmd = "", hasWhere = false;
    // var thisChart = this;
    //prepare where condition first
    //if (isDefined(whereCondition) && whereCondition!="")
    //{
    //    wherecmd = " where ";
    //    $.each(whereCondition, function (index, where) {
    //        if (index > 0)
    //            wherecmd += ' and ';
    //        wherecmd += where.Dataset + "." + where.Field + " in (" + where.Values.map(function (v) { return "'" + v + "'" }).join(',') +")";
    //    });
    //}
    //if CachedQuery prop is defined and non-empty, then add where condition to it and return
    //or else generate query and add to CachedQuery
    //if (isDefined(thisChart.CachedQuery) && thisChart.CachedQuery != "") {
    //    query = thisChart.CachedQuery.Select + " " + thisChart.CachedQuery.Where + " " + thisChart.CachedQuery.Groupby;
    //}
    //else {
    $this.CachedQuery = {};
    var groupFields = [], hasAggregation = false, datasets, wherecmd, ordercmd,
        hasOrder = false, orderFields = [];
    var $thisSpecter = $this.Parent;
    // Log($this.Datasets);
    datasets = $this.Datasets;
    if (!isDefined(datasets))
        datasets = [];
    $this.Datasets = datasets;

    //if where is defined the process and add it to query
    if (isDefined($this.QuerySet.Where)) {
        $.each($this.QuerySet.Where, function (index, where) {
            var field = where.Dataset + "." + where.Field, operator = " in ";
            //if dataset info is not already added in query
            if (datasets.indexOf(where.Dataset) == -1) {
                datasets.push(where.Dataset);
            }
            var whereValue = where.Value, prm, value;
            if (isString(whereValue)) {
                if (isDefined($this.Parameters)) {
                    prm = findAndGetObj($this.Parameters, "Name", whereValue)
                }

                if (isUndefined(prm))//if parameter is not defined @Chart level, search it @Specter level
                {
                    prm = findAndGetObj($thisSpecter.Parameters, "Name", whereValue)
                }
                else if (isUndefined(prm.Value))//if parameter is defined @Chart level, but values is not yet set then search it @Specter level
                {
                    prm = findAndGetObj($thisSpecter.Parameters, "Name", whereValue)
                }

                //consider the value only if the parameter is set
                if (isDefined(prm) && isDefined(prm.Value)) {
                    value = prm.Value;
                }
            }
            //if parameter value is set then check if value (is array && it is not empty ) or (it is not an array && not empty) then include the where condition
            if (isDefined(value) &&
                ((isArray(value) && value.length > 0) || (!isArray(value) && !isEmpty(value)))
                ) {
                //dont add 'and' for first time
                if (hasWhere == true)
                    wherecmd += ' and ';
                else
                    wherecmd = " where "; //at very first time add ' where '

                if (isArray(value)) {
                    value = value.map(function (v) { return "'" + v + "'"; });
                }
                else {
                    value = "'" + value + "'";
                }
                if (isDefined(where.Operator))
                    operator = where.Operator;
                else
                    operator = " in ";
                wherecmd += field + operator + "(" + value + ")";
                hasWhere = true;
            }
        });
    }
    if ($this.QuerySet.Select.length > 0) {
        query = "select ";
        //get select stmt
        $.each($this.QuerySet.Select, function (index, select) {

            var field = select.Field; //Initially had  select.Dataset + "." + select.Field; //if we follow this route, it will be hard if math operations are used in columns
            //if dataset info is not already added in query
            if (datasets.indexOf(select.Dataset) == -1) {
                datasets.push(select.Dataset);
            }

            if (isDefined(select.Order)) {
                hasOrder = true;
                orderFields.push(select.Alias/*field*/ + " " + select.Order);
            }

            var alias = select.Alias;
            //check if aggregation is provided on the field, if yes prepare field accordingly
            if (isDefined(select.Aggregation) && (select.Aggregation != "" || isAggregatedField(field))) {
                hasAggregation = true;
                //isAggregatedField - for columns like "(CAST(sum(timelyevents.numerator) AS float)/CAST(sum(timelyevents.denominator) AS float))" will return true
                // for this case we dont user select.Field as alias name
                if (!isAggregatedField(field)) {

                    if (isUndefined(alias) || alias == "") {
                        alias = select.Aggregation + "_" + select.Field; //SUM_FIELDNAME
                    }
                    field = select.Aggregation + "(" + field + ")"; //SUM(DS.FIELDNAME)
                }

            }
            else {
                //if no aggregation provided on current field, 
                //it might be available in other field so add current field to group by list
                groupFields.push(field);
            }

            //check if any alias name is provided for current field,  if yes apply that
            if (isDefined(alias) && alias != "") {
                field += " as " + alias;
            }
            query += field + ",";
        });
        query = query.slice(0, -1); //remove last ','

        query += " from ";

        //generate relationship from connected Datasets
        query += getRelationshipQuery($this.Parent, $this.Datasets);
        $this.CachedQuery.Select = query;

        if (hasWhere = true) {
            query += wherecmd;
            $this.CachedQuery.Where = wherecmd;
        }
    }

    if (hasAggregation && groupFields.length > 0) {
        $this.CachedQuery.Groupby = " group by " + groupFields.join(',');
        query += $this.CachedQuery.Groupby;
    }
    if(isDefined($this.QuerySet.Having))
    {
        if(hasAggregation && $this.QuerySet.Having.length >0)
        {
            query += " having ";
            var havingCount = 0;
            $.each($this.QuerySet.Having, function (index, having) {
                if (havingCount > 0)
                {
                    query += " and ";
                }
                query += having.Field + having.Condition;
                havingCount++;
            });
        }
    }
   

    if (hasOrder && orderFields.length > 0) {
        query += " order by " + orderFields.join(',');
    }
    //}

    //Now that we have select statement, better check if any of the dataset referes to stored proc
    //if dataset has stored procedures then get the create table variable script using dataset
    var createScript = "";

    $.each($this.Datasets, function (i, ds) {
        var ds = $thisSpecter.getDataset(ds);
        if (isDefined(ds.StoredProcedure)) {
            createScript += getCreateTableScript(ds);
            var params = [];
            var paramsToPass = findAndGetObj($this.QuerySet.DatasetParams, "Dataset", ds.Name);
            //check Questsets datsetParamter
            //and get the values from charts/slicers Parameter section
            if (isDefined(paramsToPass)) {

                //get the values from Chart params based on refered queryset params
                $.each(paramsToPass.Parameters, function (i, param) {

                    var chartparam = findAndGetObj($this.Parameters, "Name", param.Value);

                    if (isUndefined(chartparam))//if parameters not defined @Chart level check @Specter level
                    {
                        chartparam = findAndGetObj($thisSpecter.Parameters, "Name", param.Value);
                    }
                    else if (isUndefined(chartparam.Value)) {
                        chartparam = findAndGetObj($thisSpecter.Parameters, "Name", param.Value);
                    }

                    if (isDefined(chartparam) && isDefined(chartparam.Value)) {
                        params.push({
                            Name: param.Name,
                            Value: chartparam.Value
                        });
                    }
                });
            }
            //Now dataset param values has been according to Queryset reference
            //now lets assign the values to datasets createtable script

            $.each(ds.Parameters, function (i, p) {
                var param = findAndGetObj(params, "Name", p);

                if (isDefined(param)) {
                    var val;
                    if (isArray(param.Value)) {
                        val = "'" + param.Value.join(',') + "'";//param.Value.map(function (v) { return "'" + v + "'"; })
                    }
                    else {
                        val = "'" + param.Value + "'";
                    }
                    createScript += " " + p + "=" + val + ",";
                }
                else {
                    createScript += " " + p + "=NULL,";
                }
            });
            createScript = createScript.slice(0, -1) + ';';
        }
    });

    return createScript + query;
}

function getRelationshipQuery($specter, datasetArray) {
    var q = '', relFound = false, foundRels = [], field, lookupds, lookupfield, nonCurrentSet, join = "";
    var specName = $specter.Name.replace(" ", "");
    $.each(datasetArray, function (index, dataset) {
        var ds = $specter.getDataset(dataset);

        if (index == 0) {
            //fromField
            q += ds.Table + " as " + dataset;
        }
        //if current datasets relation is already found the dont parse
        if (foundRels.indexOf(dataset) == -1) {
            nonCurrentSet = datasetArray.filter(function (i) {
                return i != dataset;
            });
            //get the fields info from relationships asset
            $.each($specter.Relationships, function (j, rel) {
                relFound = false;
                if (rel.Dataset.Name == dataset && nonCurrentSet.indexOf(rel.LookupDataset.Name) != -1) {
                    relFound = true;
                    field = rel.Field;
                    lookupds = rel.LookupDataset;
                    lookupfield = rel.LookupField;
                    join = rel.Join;
                    return false;
                }
                else if (rel.LookupDataset.Name == dataset && nonCurrentSet.indexOf(rel.Dataset.Name) != -1) {
                    relFound = true;
                    field = rel.LookupField;
                    lookupds = rel.Dataset;
                    lookupfield = rel.Field;
                    join = rel.Join;
                    return false;
                }
            });
            //if relationship found then create query
            if (relFound == true) {
                if (foundRels.indexOf(lookupds) == -1) {
                    q += " " + join + " join " + lookupds.Table + " as " + lookupds.Name + " on " + dataset + '.' + field + '=' + lookupds.Name + '.' + lookupfield;
                    foundRels.push(lookupds.Name);
                }//if relatioship was already processed the consider current dataset for innerjoin,becoz it is not yet processed.
                else {
                    q += " " + join + " join " + lookupds.Table + " as " + dataset + " on " + dataset + '.' + field + '=' + lookupds.Name + '.' + lookupfield;
                }
                foundRels.push(dataset);
            }
        }
    });

    return q;
}

//will give output like [i,j,[a,b,x,y]]
function getFieldsHierarchy(obj) {
    var res = [];
    var nodes = [];
    var keyFieldFound = false;
    var fields = obj["Fields"];
    if (isDefined(fields) && fields.length > 0) {
        res = fields;
        keyFieldFound = true;
    }

    if (keyFieldFound == true) {
        $.each(obj, function (key, value) {
            if (value instanceof Object) {
                nodes.push(value);
            }
        });
    }
    else {
        $.each(obj, function (key, value) {
            if (value instanceof Object) {
                var f = getFieldsHierarchy(value);
                if (isDefined(f) && f.length > 0) {
                    res = res.concat(f);
                }
            }
        });
    }

    var nodeFields = [];
    $.each(nodes, function (i, node) {
        var nodeRes = getFieldsHierarchy(node);
        if (nodeRes.length > 0)
            nodeFields = nodeFields.concat(nodeRes);
    });
    if (nodeFields.length > 0)
        res.push(nodeFields);
    return res;
}

function getStoredProcColumns(dataset, constr) {
    if (isDefined(dataset.StoredProcedure)) {
        try {

            $.ajax({
                url: restURL + "/GetStoredProcColumns",
                type: reqType,
                dataType: JSONTYPE,

                data: { storedproc: dataset.StoredProcedure, constring: dataset.Connection.ConnectionString },
                crossdomain: true,
                xhrFields: {
                    withCredentials: true
                },
                success: function (response) {
                    //Log(response);
                    //response is a key value object
                    dataset.Columns = response;
                    //dataset.Table = "@" + dataset.Name;
                },
                failure: function (xhr, status, err) {
                    Log(["failed :", xhr.responseText, err].join());
                }
            });
        }
        catch (err) {
            Log(err.message);
        }
    }
}

function getCreateTableScript(dataset) {
    //in this case dataset.Table will be like table variable "@<datasetname>"
    var q = "declare " + dataset.Table + " as table (";
    var clmns = [];
    $.each(dataset.Columns, function (name, type) {
        clmns.push(name + " " + type);
    });
    q += clmns.join(',');
    q += ") Insert into " + dataset.Table + " EXEC " + dataset.StoredProcedure;
    return q;

}

function getCalendarDiv() {

    var calendar = '<div class="mpr-monthsContainer mpr-calendar-separator">'
                   + '<div class="mpr-MonthsWrapper"><span data-month=0 class="col-xs-3 mpr-month">Jan</span>'
                       + '<span data-month=1 class="col-xs-3 mpr-month">Feb</span><span data-month=2 class="col-xs-3 mpr-month">Mar</span>'
                        + '<span data-month=3 class="col-xs-3 mpr-month">Apr</span>'
                        + '<span data-month=4 class="col-xs-3 mpr-month">May</span>'
                        + '<span data-month=5 class="col-xs-3 mpr-month">Jun</span>'
                        + '<span data-month=6 class="col-xs-3 mpr-month">Jul</span>'
                        + '<span data-month=7 class="col-xs-3 mpr-month">Aug</span>'
                        + '<span data-month=8 class="col-xs-3 mpr-month">Sep</span>'
                        + '<span data-month=9 class="col-xs-3 mpr-month">Oct</span>'
                        + '<span data-month=10 class="col-xs-3 mpr-month">Nov</span>'
                        + '<span data-month=11 class="col-xs-3 mpr-month">Dec</span>'
                    + '</div>'
                + '</div>';

    var monthrangepicker = $('<div class="row mpr-calendarholder" id="divMonthPicker">'
       + '<div class="col-xs-6"><div class="mpr-calendar row month-picker-1"><h5 class="col-xs-12">'
                  + '<i class="mpr-yeardown fa fa-chevron-circle-left"></i><span class="month-picker-header-yr"></span></h5>'
              + calendar
            + '</div> </div>'
        + '<div class="col-xs-6"><div class="mpr-calendar row month-picker-2">'
                + '<h5 class="col-xs-12"><span class="month-picker-header-yr"></span><i class="mpr-yearup fa fa-chevron-circle-right "></i></h5>'
               + calendar
           + '</div> </div></div>');

    return monthrangepicker;
}
//params is expected to be a json object
function processRestSvcDataSet(serviceurl, paramsJson, successcallback, failurecallback) {
    var starttime = new Date().getTime();
    //Log(starttime);
    $.ajax({
        url: serviceurl,
        type: reqType,
        //dataType: JSONTYPE,
        data: paramsJson,
        //crossdomain: true,
        //xhrFields: {
        //    withCredentials: true
        //},
        success: function (response) {
            //console.log(response);
            Log("Time taken:" + (new Date().getTime() - starttime));
            successcallback(JSON.parse(response));
        },
        failure: function (xhr, status, err) {
            console.log(["failed :", xhr.responseText, err].join());
            if (isDefined(failurecallback)) {
                failurecallback(xhr);
            }
        }
    });
}
function getRestDSParamsWithValue(dataset, item) {
    var itemDSParams = findAndGetObj(item.QuerySet.DatasetParams, "Dataset", dataset.Name);
    var retrnObj = {};
    $.each(dataset.Parameters, function (i, name) {
        var prm = findAndGetObj(itemDSParams.Parameters, "Name", name);
        //if value parameter i.e., Value : @EventType is not defined then consider null value for current service parameter
        if (isDefined(prm) && isDefined(prm.Value)) {
            //find the valuePrm @chart level
            var itemparam = findAndGetObj(item.Parameters, "Name", prm.Value);
            if (isUndefined(itemparam))//if parameters not defined @Chart level check @Specter level
            {
                itemparam = findAndGetObj(item.Parent.Parameters, "Name", prm.Value);
            }
            else if (isUndefined(itemparam.Value)) {
                itemparam = findAndGetObj(item.Parent.Parameters, "Name", prm.Value);
            }
            if (isDefined(itemparam) && isDefined(itemparam.Value)) {
                var val;
                if (isArray(itemparam.Value)) {
                    val = itemparam.Value.map(function (v) { return "'" + v + "'"; });
                    val = val.join(',');
                }
                else {
                    val = "'" + itemparam.Value + "'";
                }
                retrnObj[name] = val;
            }
            else {
                retrnObj[name] = null;
            }
        }
        else {
            retrnObj[name] = null;
        }
    });
    return retrnObj;
}
function drillRecords(lookupfields, data) {
    var res = [];
    var nonLookUpkeys = [];
    $.each(data, function (i, row) {
        var currRec = {};
        var nonLookupValues = {};

        if (nonLookUpkeys.length <= 0) {
            $.each(row, function (key, value) {
                nonLookUpkeys.push(key);
            });
            nonLookUpkeys = nonLookUpkeys.filter(function (elem) {
                return lookupfields.indexOf(elem) === -1;
            });
        }
        $.each(lookupfields, function (j, field) {
            currRec[field] = row[field];
        });
        $.each(nonLookUpkeys, function (j, field) {
            nonLookupValues[field] = row[field];
        });
        //check if CurrRec is already there in parent obj
        //if exists the get the obj or else create one and add it to parent obj
        var existingObj = getExistingObj(res, currRec, lookupfields);

        if (isDefined(existingObj)) {
            if (isDefined(existingObj.$children)) {
                if (!isEmpty(nonLookupValues)) {
                    existingObj.$children.push(nonLookupValues);
                }
            }
            else {
                existingObj["$children"] = [];
                if (!isEmpty(nonLookupValues)) {
                    existingObj["$children"].push(nonLookupValues);
                }
            }
        }
        else {
            currRec["$children"] = [];
            if (!isEmpty(nonLookupValues)) {
                currRec["$children"].push(nonLookupValues);
            }
            res.push(currRec);
        }
    });
    return res;
}