var previousPoint = null;
var paretoDefault = {
    chart: {
        type: 'column',
        //options3d: {
        //    enabled: true,
        //    alpha: 15,
        //    beta: 15,
        //    depth: 50,
        //    viewDistance: 25
        //},
        events: {
            load: function (event) {
                onChartLoad(event);
            }
        },
        borderWidth: 1,
        borderRadius: 0
    },
    credits: { enabled: false },
    scrollbar: {
        enabled:true,
        barBackgroundColor: 'gray',
        barBorderRadius: 7,
        barBorderWidth: 0,
        buttonBackgroundColor: 'gray',
        buttonBorderWidth: 0,
        buttonArrowColor: 'yellow',
        buttonBorderRadius: 7,
        rifleColor: 'yellow',
        trackBackgroundColor: 'white',
        trackBorderWidth: 1,
        trackBorderColor: 'silver',
        trackBorderRadius: 7
    },
    title: {
        text: 'Pareto'
    },
    xAxis: {       
        //categories : ['Medication','Infection', 'Decompensation','Care Sensitive','Procedural', 'Other'],
        labels: {
            rotation: -45,
            style: {
                fontSize: '12px'
                //    fontFamily: 'Verdana, sans-serif'
            }
        },
        type: "category"
        //,max:6
    },
    yAxis: {       
        title: {
            text: "?????"
        }
    },
    scrollbar: {
        enabled: true
    },
    plotOptions: {
        series: {
            //pointPadding: 0, // Defaults to 0.1
            //groupPadding: 0.01, // Defaults to 0.2
            //cursor: 'pointer',
            allowPointSelect: true,            
            point: {                
                events: {
                    //select: function (event) {
                    //    onSeriesPointSelect(this, event);
                    //},
                    //unselect: function (event) {
                    //    onSeriesPointUnselect(this, event);
                    //},

                    click: function (event) {
                        event.SourceType = "Chart";
                        onSeriesPointClick(this, event);
                    }
                }
            }
        },
        column: {
            depth: 25    
        }
    },
    legend: {
        enabled: false
    },
    tooltip: {
        pointFormat: '<b>{point.y:.1f}</b>'
    }   
};

var timeSeriesDefault = {
    chart: {
        type :"line",
        events: {
            load: function (event) {
                onChartLoad(event);
            }
        },
        borderWidth: 1,
        borderRadius: 0
    },
    title: {
        text: 'Time Series',
    },
    xAxis: {
        type: 'category',
        labels: {
            rotation: -45,
            style: {
                fontSize: '12px'
            },
            
            //formatter: function () {
             
            //    return this.value.substring(0, 3)+"";
            //},
        
        },
        max:10
    },
    scrollbar: {
        enabled: true
    },
    credits: { enabled: false },
    plotOptions: {
        series: {
            cursor: 'pointer',
            allowPointSelect: true,
            point: {
                events: {
                    click: function (event) {
                        event.SourceType = "Chart";
                        onSeriesPointClick(this, event);
                    }
                }
            }
        }
        
    },
    //tooltip: {
    //    pointFormat: '<b>{point.y:.1f}</b>'
    //},
    legend: {
        enabled: false
    }
};
var scatterDuration = 1000;
var scatterFunction = 'swing';

var lineDuration = 1000;
var lineFunction = 'swing';

var startX = 1000;
var startY = 8;

//var funnelColor = 'rgba(0, 0, 255, .85)';
var funnelColor = 'rgba(0, 128, 0, .85)';
var avgColor = 'rgba(0, 0, 128, .75)';
var funnelFillColor = 'rgba(107,142,35, .25)';
var plotColor = 'rgba(255, 0, 0, 1)';
var chartColor = 'rgba(238,232,170, .25)';

var xMin = 0;
var xMax = 1000;

var yMin = -0.5;
var yMax = 1.2;
var funnelPlotChart = {
    chart: {
        style: { fontFamily: 'Arial' },
        borderWidth: 1,
        borderRadius: 0,
        backgroundColor: '#FFFFFF',//,
        events: {
            load: function (event) {
                onChartLoad(event);
                yMax = event.target.yAxis[0].dataMax;
                yMin = event.target.yAxis[0].dataMin;

                event.target.yAxis[0].setExtremes(yMin, yMax);
                event.target.xAxis[0].setExtremes(event.target.xAxis[0].dataMin, event.target.xAxis[0].dataMax);
            }
        },
        zoomType: 'xy'
    },
    credits: { enabled: false },
    title: {
        text: 'Funnel plot',
    },
    tooltip: { hideDelay: 100, snap: 0 },
    plotOptions: {
        //series: {
        //    stickyTracking: false,           
        //    cursor: 'pointer',
        //    allowPointSelect: true,
        //    //marker: {
        //    //    states: {
        //    //        select: {
        //    //            radius : 7,
        //    //            fillColor: '#551a8b',
        //    //            lineWidth: 0,
        //    //            lineColor : '#FFFF'
        //    //        }
        //    //    }
        //    //},
        //    events: {
        //        legendItemClick: function () {
        //            return false;
        //        },
        //        point: {
        //            click: function (event) {
        //                event.SourceType = "Chart";
        //                onSeriesPointClick(this, event);
        //            }
        //        }
        //    }
        //}

        series: {
            cursor: 'pointer',
            allowPointSelect: true,
            point: {
                events: {
                    click: function (event) {
                        event.SourceType = "Chart";
                        onSeriesPointClick(this, event);
                    }
                }
            }
        }        
    },
    

    legend: {
        enabled: true,
        itemStyle: {
            cursor : "default"
        },
        navigataion: {
            enabled : false
        }
    },
    xAxis: {
        startOnTick: false,
        //title: { text: 'Discharges', style: { color: 'black' } },   
        gridLineColor: 'rgba(0,0,0,1)',
        lineColor: 'black',
        tickColor: 'black',
        labels: { style: { color: 'black' } }
    },
    yAxis: {
        startOnTick : false,
        //title: { text: 'ALOS', style: { color: 'black' } },
        gridLineWidth: 0,
        lineWidth: 1,
        tickLength:5,
        tickWidth: 1,
        tickInterval: .10,
        min: yMin,
        max: yMax,
        lineColor: 'black',
        tickColor: 'black',
        labels: { style: { color: 'black' } },
        events: {
            afterSetExtremes: function (event) {
                yMax = this.dataMax;
                yMin = this.dataMin;

                if (event.userMax == undefined)
                    this.setExtremes(yMin, yMax);
            }
        }
    }//,
    //series: [,
    //{
    //    name: 'funnelFill',
    //    showInLegend: false,
    //    fillColor: funnelFillColor,
    //    lineWidth: 0,
    //    type: 'arearange',
    //    data: rangeData,
    //    marker: { enabled: false },
    //    enableMouseTracking: false,
    //}]
}
function doScaledTimeout(i, x, arr, seriesData) {
    //setTimeout(function () {
  //  setPointToOriginalPosition(i, arr, seriesData);
    //}, 1);
}

function setPointToOriginalPosition(val, arr, seriesData) {

    var xVal = arr[val].x;
    var yVal = arr[val].y;
    try {        
        seriesData[val].update({ x: xVal, y: yVal }, true, { duration: 100,easing: 'easeOutQuad' });
    }
    catch (err)
    {
        Log(err);
    }
}