
//Leaflet images config:
L.Icon.Default.imagePath = './scripts/images';

var map
var allLayers = {}
var overlays = {}
var addedLayers = []
var selectedFeatures = []
var allSingleLayers = {}

var debug = false
var debugLevel = 4

var initialBaseLayer = getParameterByName('baseLayer')
if(!initialBaseLayer) {
    initialBaseLayer = 'LIST Topographic';
} else {
  initialBaseLayer = initialBaseLayer.replace('-', ' ')
}

var initialLayers = getParameterByName('layers')
if(initialLayers != null) {
  initialLayers = initialLayers.split(';')
}

$(document).on('click', '.feature-row', function (e) {
  // $(document).off("mouseout", ".feature-row", clearHighlight)
  var thisLayer = allLayers[$(this).attr('id')]
  addLayerToMap(thisLayer)
  if(screen.width < 767) {
    animateSidebar()
  }
})

// data table actions
$(document).on("mouseenter", ".data-table tr", function(e) {
  var id = $(this)[0].id
  var layer = allSingleLayers[id]
  if(layer != null) {
    highlightLayer(layer)
  }
});
$(document).on("mouseleave", ".data-table tr", function(e) {
  var id = $(this)[0].id
  var layer = allSingleLayers[id]
  if(layer != null) {
    resetLayer(layer)
  }
});
$(document).on("click", ".data-table tr", function(e) {
  var id = $(this)[0].id
  var layer = allSingleLayers[id]
  if(layer != null) {
    try {
      map.fitBounds(layer.getBounds());
    } catch (TypeError) {
      console.log(layer)
      map.panTo(layer._latlng)
    }
  }
});

$('#about-btn').click(function () {
  $('#aboutModal').modal('show')
  $('.navbar-collapse.in').collapse('hide')
  return false
})

$('#data-detail-close-btn').click(function () {
  $('#data-detail').hide()
  return false
})
$('#data-detail-clear-btn').click(function () {
  clearSelectedFeatures()
  $('#data-detail').hide()
  return false
})

$('#full-extent-btn').click(function () {
  // map.fitBounds(boroughs.getBounds())
  $('.navbar-collapse.in').collapse('hide')
  return false
})

$('#legend-btn').click(function () {
  $('#legendModal').modal('show')
  $('.navbar-collapse.in').collapse('hide')
  return false
})

$('#login-btn').click(function () {
  $('#loginModal').modal('show')
  $('.navbar-collapse.in').collapse('hide')
  return false
})

$('#list-btn').click(function () {
  animateSidebar()
  return false
})

$('#nav-btn').click(function () {
  $('.navbar-collapse').collapse('toggle')
  return false
})

$('#sidebar-toggle-btn').click(function () {
  animateSidebar()
  return false
})

$('#sidebar-hide-btn').click(function () {
  animateSidebar()
  return false
})

function animateSidebar () {
  $('#sidebar').animate({
    width: 'toggle'
  }, 350, function () {
    map.invalidateSize()
  })
}

/* Basemap Layers */
var LISTTopographic = new L.tileLayer('https://services.thelist.tas.gov.au/arcgis/rest/services/Basemaps/Topographic/ImageServer/tile/{z}/{y}/{x}', {
  attribution: 'Topographic Basemap from <a href=http://www.thelist.tas.gov.au>the LIST</a> &copy State of Tasmania',
  maxZoom: 20,
  maxNativeZoom: 18
})

var LISTAerial = new L.tileLayer('https://services.thelist.tas.gov.au/arcgis/rest/services/Basemaps/Orthophoto/ImageServer/tile/{z}/{y}/{x}', {
  attribution: 'Base Imagery from <a href=http://www.thelist.tas.gov.au>the LIST</a> &copy State of Tasmania',
  maxZoom: 20,
  maxNativeZoom: 19
})
var baseLayers = {
  'LIST Topographic': LISTTopographic,
  'LIST Imagery': LISTAerial
}


map = L.map('map', {
  zoom: 8,
  center: [-42.070,146.780],
  layers: baseLayers[initialBaseLayer],
  zoomControl: true,
  attributionControl: false
})

/* GPS enabled geolocation control set to follow the user's location */
var locateControl = L.control.locate({
  position: 'topleft',
  drawCircle: true,
  follow: true,
  setView: true,
  keepCurrentZoomLevel: true,
  markerStyle: {
    weight: 1,
    opacity: 0.8,
    fillOpacity: 0.8
  },
  circleStyle: {
    weight: 1,
    clickable: false
  },
  icon: 'fa fa-location-arrow',
  metric: true,
  strings: {
    title: 'My location',
    popup: 'You are within {distance} {unit} from this point',
    outsideMapBoundsMsg: 'You seem located outside the boundaries of the map'
  },
  locateOptions: {
    maxZoom: 18,
    watch: true,
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 10000
  }
}).addTo(map)

/* Larger screens get expanded layer control and visible sidebar */
if (document.body.clientWidth <= 767) {
  var isCollapsed = true
} else {
  var isCollapsed = false
}

var layerControl = L.control.layers(baseLayers, overlays, {
  collapsed: isCollapsed
}).addTo(map)

var LISTRest = 'http://services.thelist.tas.gov.au/arcgis/rest/services/'
var GlenorchyWMS = 'https://maps.gcc.tas.gov.au/geoserver/GCC_cc/ows'
var CityOfLauncestonRest = 'http://mapping.launceston.tas.gov.au/arcgis/rest/services/'
var CityOfHobartRest = 'https://services1.arcgis.com/NHqdsnvwfSTg42I8/arcgis/rest/services/'

getWMS(GlenorchyWMS, {label: 'glenorchy'})
getArcGISREST(CityOfLauncestonRest, 'Public', {f: 'pjson'}, {label: 'lcc'})
getArcGISREST(LISTRest, 'Public', {f: 'pjson'}, {label: 'list'})
// getArcGISREST(CityOfHobartRest, '', {f: 'pjson'}, {label: 'hcc'})

function getWMS (baseURL, options) {
  $.get(baseURL + '?SERVICE=WMS&request=getcapabilities', function (xml) {
    $(xml).find('Layer').find('Layer').each(function () {
      var title = $(this).find('Title').first().text()
      var name = $(this).find('Name').first().text()

      // Check for layer groups
      var patt = new RegExp('Group')
      var res = patt.test(title)
      if (!res) {
        var oneLayer = {
          id: options.label + '-' + name,
          group: '',
          title: title
        }
        addLayerToList(oneLayer)
        oneLayer.meta = {name: name}
        oneLayer.url = baseURL
        oneLayer.type = 'wms'
        oneLayer.added = false
        oneLayer.visible = false
        allLayers[oneLayer.id] = oneLayer

        // If the layer is in the initial list, load it
        if($.inArray(oneLayer.id, initialLayers) !== -1) {
          addLayerToMap(oneLayer)
        }
      }
    })
  })
}

function getArcGISREST (baseURL, startLocation, params, options) {
  log("Getting REST info for: " + options.label, 3)
  $.getJSON(baseURL + startLocation, params, function (data) {
    var services = data.services
    if (services != null) {
      for (var i = services.length - 1; i >= 0; i--) {
        if (services[i].type === 'MapServer') {
          var thisService = services[i]
          var thisURL = baseURL + thisService.name + '/MapServer'
          $.getJSON(thisURL, params, (function (url, service) {
            return function (data) {
              var layers = data.layers
              for (var j = layers.length - 1; j >= 0; j--) {
                var thisLayer = layers[j]
                var oneLayer = {
                  id: options.label + '-' + service.name + '-' + thisLayer.id,
                  group: service.name,
                  title: thisLayer.name
                }
                addLayerToList(oneLayer)
                oneLayer.meta = thisLayer
                oneLayer.url = url
                oneLayer.type = 'esri'
                oneLayer.added = false
                oneLayer.visible = false
                allLayers[oneLayer.id] = oneLayer

                // If the layer is in the initial list, load it
                if($.inArray(oneLayer.id, initialLayers) !== -1) {
                  addLayerToMap(oneLayer)
                }
              }
            }
          }(thisURL, thisService)))
        } else if (services[i].type = 'FeatureServer') {
          // We don't support feature service, Hobart... Get some map services sorted!!!
          log("Not yet implemented featureserver...", 1)
        }
      }
    }
  })
}

function addLayerToList (layer) {
  // layer is an object with unique id, group and title
  $('#feature-list tbody').append('<tr class="feature-row searchable" id="' + layer.id + '">\
		<td style="vertical-align: middle;">' + layer.title + '</td>\
		<td style="vertical-align: middle;"><i class="fa fa-chevron-right pull-right"></i></td></tr>')
}

function addLayerToMap (layer) {
  if($.inArray(layer.id, addedLayers) !== -1) {
    return;
  }
  addedLayers.push(layer.id)
  updateLayersParameter()
  layer.added = true
  layer.visible = true

  // TODO: Attribution
  if (layer.type === 'esri') {
    var createdLayer = L.esri.dynamicMapLayer({
      url: layer.url,
      opacity: 1,
      layers: [layer.meta.id],
      id: layer.id
    }).addTo(map)

    overlays[layer.title] = createdLayer
  } else if (layer.type = 'wms') {
    var createdLayer = new L.TileLayer.WMS(layer.url, {
      layers: layer.meta.name,
      format: 'image/png',
      transparent: true,
      maxZoom: 20,
      id: layer.id
    }).addTo(map)

    overlays[layer.title] = createdLayer
  }

  map.removeControl(layerControl)
  layerControl = L.control.layers(baseLayers, overlays, {
    collapsed: isCollapsed
  }).addTo(map)
}

map.on('click', function (e) {
  // Hide the table
  $("#data-detail").hide()

  // Clear the interface
  $('#data-tabs').empty()
  var dataTabContents = $("#data-tab-contents");
  var currentChildren = dataTabContents.children();
  for (var i = currentChildren.length - 1; i >= 0; i--) {
    currentChildren[i].remove()
  }

  // Clear the map
  clearSelectedFeatures()

  // Get the WMS and REST vector info
  for (var i = addedLayers.length - 1; i >= 0; i--) {
    var thisLayer = allLayers[addedLayers[i]]
    if(!thisLayer.visible) {
      continue;
    }
    if (thisLayer.type === 'wms') {
      getFeatureWMS(thisLayer, e.latlng)
    } else if (thisLayer.type === 'esri') {
      getFeatureREST(thisLayer, e.latlng)
    } else {
      log("Failed to handle layer: " + layer.name, 1)
    }
  }
})

function clearSelectedFeatures() {
  for (var i = selectedFeatures.length - 1; i >= 0; i--) {
    selectedFeatures[i].removeFrom(map)
  }
  selectedFeatures = []
  allSingleLayers = {}
}

function handleData(layer, data) {
  if(data.features.length === 0) {
    return
  }
  for (var i = data.features.length - 1; i >= 0; i--) {
    data.features[i].uuid = guid()

  }
  addDataToTable(layer.title, layer.id, data.features)
  addDataToMap(data)
  $("#data-detail").show()
}

function getFeatureREST(layer, clickCoords) {
  log("Getting REST info for: " + layer.title, 3)
  L.esri.identifyFeatures({
    url: layer.url
  })
  .on(map)
  .at([clickCoords.lat, clickCoords.lng])
  .layers('layers=visible:' + layer.meta.id)
  .run(function(error, data, response){
      handleData(layer, data)
  });
}

function getFeatureWMS(layer, clickCoords) {
  log("Getting info for layer: " + layer.title, 2)
  var wms_gf_url = layer.url
  var bbox = (clickCoords.lng - 0.0001) + 
      "," + (clickCoords.lat - 0.0001) + 
      "," + (clickCoords.lng + 0.0001) + 
      "," + (clickCoords.lat + 0.0001) + ',EPSG:4326'

  var parameters = {
      service : 'WFS',
      version : '1.1.1',
      request : 'GetFeature',
      typeName : layer.meta.name,
      maxFeatures : 100,
      outputFormat : 'application/json',
      SrsName : 'EPSG:4326',
      bbox : bbox
  };
  $.ajax({
      url : wms_gf_url + L.Util.getParamString(parameters),
      dataType : 'json',
      success : handleWMSJSON(layer)
  });
}

// This is a weird closure function...
function handleWMSJSON(layer) {
  log("Handling JSON for layer: " + layer.title, 2)
  return function(data) {
    if (data.features.length > 0) {
      handleData(layer, data)
    }
  };
}

function addDataToTable(title, id, data) {
  if (data.length === 0) {
    return
  }
  // Remove the bbox, nobody got time for dat
  for (var i = data.length - 1; i >= 0; i--) {
    delete data[i].properties["bbox"]
    delete data[i].properties["SHAPE.LEN"]
    delete data[i].properties["SHAPE"]
    delete data[i].properties["SHAPE.AREA"]
    delete data[i].properties["LIST_GUID"]
  }

  var tableContent = '<div class="table"><table class="table table-condensed table-striped table-hover table-nonfluid data-table">'
  tableContent += '<thead>'
  tableContent += '<th style="display:none">uuid</th>'
  for (var name in data[0].properties) {
    tableContent += '<th>' + name + '</th>'
  };
  tableContent += '</thead>'
                  
  for (var i = data.length - 1; i >= 0; i--) {
    var oneRow = data[i]
    tableContent += '<tr id=' + data[i].uuid + '>'
    tableContent += '<td style="display:none">' + data[i].uuid + '</td>'
    for (var name in oneRow.properties) {
      tableContent += '<td>' + oneRow.properties[name] + '</td>'
    };
    tableContent += '</tr>'
  }
  var thisId = id.replace('-','').replace('/', '').replace('\\','')
  $('#data-tabs').append('<li><a data-toggle="tab" href="#'+thisId+'">'+title+'</a></li>');
  $("#data-tab-contents").append('<div class="tab-pane fade in" id="'+thisId+'">'+tableContent+'</div>');
  $('#data-tabs a[href="#'+thisId+'"]').trigger('click');
}

function addDataToMap(data) {
  var selectedFeature = L.geoJson(data, {
    style: function (feature) {
        return {color: 'yellow'};
    },
    onEachFeature: function (feature, layer) {
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: openTable()
        });
        allSingleLayers[feature.uuid] = layer
    },                
    pointToLayer: function (feature, latlng) {
        var oneFeature =  L.circleMarker(latlng, {
            radius: 5,
            fillColor: "yellow",
            color: "#000",
            weight: 5,
            opacity: 0.6,
            fillOpacity: 0.2
        });
        return oneFeature
    }
  });
  selectedFeature.addTo(map);
  selectedFeatures.push(selectedFeature)
}

function openTable() {
  $('#data-detail').show()
}

function highlightLayer(layer) {
  layer.setStyle({
      fillColor: "yellow",
      color: "yellow",
      weight: 5,
      opacity: 1
  });
}
function resetLayer(layer) {
  layer.setStyle({
      radius: 5,
      fillColor: "yellow",
      color: "yellow",
      weight: 5,
      opacity: 0.6,
      fillOpacity: 0.2
  });
}

function highlightFeature(e) {
  var layer = e.target;
  highlightLayer(layer)
  $("#" + layer.feature.uuid).addClass('info')
  if (!L.Browser.ie && !L.Browser.opera) {
      layer.bringToFront();
  }
}

function resetHighlight(e) {
  var layer = e.target;
  resetLayer(layer)
  $("#" + layer.feature.uuid).removeClass('info')
}

function log(message, level) {
  if (debug && level < debugLevel) {
    console.log(message)
  }
}
function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

function updateLayersParameter() {
  var layersString = ""
  for (var i = addedLayers.length - 1; i >= 0; i--) {
    var thisLayer = allLayers[addedLayers[i]]
    if(thisLayer != null) {
      layersString += thisLayer.id + ';'
    }
  }
  layersString = layersString.substring(0, layersString.length - 1);
  setParameter('layers', layersString)
}

//URL Parameter functions
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function setParameter(paramName, paramValue) {
    var url = window.location.href;
    var hash = location.hash;
    url = url.replace(hash, '');
    if (url.indexOf(paramName + "=") >= 0)
    {
        var prefix = url.substring(0, url.indexOf(paramName));
        var suffix = url.substring(url.indexOf(paramName));
        suffix = suffix.substring(suffix.indexOf("=") + 1);
        suffix = (suffix.indexOf("&") >= 0) ? suffix.substring(suffix.indexOf("&")) : "";
        url = prefix + paramName + "=" + paramValue + suffix;
    }
    else
    {
    if (url.indexOf("?") < 0)
        url += "?" + paramName + "=" + paramValue;
    else
        url += "&" + paramName + "=" + paramValue;
    }
    window.history.replaceState({},"", url + hash);
}

function removeParameterByName (name, url) {
  if (!url) url = window.location.href
  var hash = location.hash
  url = url.replace(hash, '')
  var rtn = url.split('?')[0],
    param,
    params_arr = [],
    queryString = (url.indexOf('?') !== -1) ? url.split('?')[1] : ''
  if (queryString !== '') {
    params_arr = queryString.split('&')
    for (var i = params_arr.length - 1; i >= 0; i -= 1) {
      param = params_arr[i].split('=')[0]
      if (param === name) {
        params_arr.splice(i, 1)
      }
    }
    rtn = rtn + '?' + params_arr.join('&')
  }
  window.history.replaceState({}, '', rtn + hash)
}

// Hash the location
var hash = new L.Hash(map);

//Google Places Autocomplete
var input = (
document.getElementById('searchbox'));
var autocomplete = new google.maps.places.Autocomplete(input);
autocomplete.addListener('place_changed', function() {
    var place = autocomplete.getPlace();

    // If the place has a geometry, then present it on a map.
    if (place.geometry.viewport) {
        var b = place.geometry.viewport.toJSON();
        var southWest = L.latLng(b.south, b.west),
            northEast = L.latLng(b.north, b.east),
            bounds = L.latLngBounds(southWest, northEast);
        map.fitBounds(bounds);
    } else {
        //it's just a point, guess the zoom level.
        var lng = place.geometry.location.lng(),
            lat = place.geometry.location.lat();
        map.setView([lat, lng], 12);
    }
});

map.on('overlayadd', function(e) {
    allLayers[e.layer.options.id].visible = true
});

map.on('overlayremove', function(e) {
    allLayers[e.layer.options.id].visible = false
});

map.on('baselayerchange', function (e) {
  if (e.name !== 'LIST Topographic') {
    setParameter('baseLayer', e.name.replace(' ', '-'))
  } else {
    removeParameterByName('baseLayer')
  }
})

/* Highlight search box text on click */
$('#searchbox').click(function () {
  $(this).select()
})
$('#filter').click(function () {
  $(this).select()
})

/* Prevent hitting enter from refreshing the page */
$('#searchbox').keypress(function (e) {
  if (e.which == 13) {
    e.preventDefault()
  }
})

$('#featureModal').on('hidden.bs.modal', function (e) {
  $(document).on('mouseout', '.feature-row', clearHighlight)
})
// Ok, got to get the searching working...
$(document).ready(function () {
  (function ($) {
    $('#filter').keyup(function () {
      var rex = new RegExp($(this).val(), 'i')
      $('.searchable tr').hide()
      $('.searchable tr').filter(function () {
        return rex.test($(this).text())
      }).show()
    })
  }(jQuery))
})
$('#searchclear').click(function () {
  $('#filter').val('')
  $('.searchable tr').show()
})
