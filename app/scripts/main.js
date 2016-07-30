var map
var allLayers = {}
var overlays = {}

$(document).on('click', '.feature-row', function (e) {
  // $(document).off("mouseout", ".feature-row", clearHighlight)
  var thisLayer = allLayers[$(this).attr('id')]
  addLayerToMap(thisLayer)
})

$('#about-btn').click(function () {
  $('#aboutModal').modal('show')
  $('.navbar-collapse.in').collapse('hide')
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

map = L.map('map', {
  zoom: 10,
  center: [-42.8819154, 147.330754],
  layers: [LISTTopographic],
  zoomControl: false,
  attributionControl: false
})

/* GPS enabled geolocation control set to follow the user's location */
var locateControl = L.control.locate({
  position: 'bottomright',
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

var baseLayers = {
  'LIST Topographic': LISTTopographic,
  'LIST Imagery': LISTAerial
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
        allLayers[oneLayer.id] = oneLayer
      }
    })
  })
}

function getArcGISREST (baseURL, startLocation, params, options) {
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
                allLayers[oneLayer.id] = oneLayer
              }
            }
          }(thisURL, thisService)))
        } else if (services[i].type = 'FeatureServer') {
          // We don't support feature service, Hobart... Get some map services sorted!!!
          // console.log("Not yet implemented featureserver...")
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

var thisLayerInfo = null

function addLayerToMap (layer) {
  // TODO: Attribution
  thisLayerInfo = layer
  if (layer.type === 'esri') {
    var createdLayer = L.esri.dynamicMapLayer({
      url: layer.url,
      opacity: 1,
      layers: [layer.meta.id]
    }).addTo(map)

    overlays[layer.title] = createdLayer
  } else if (layer.type = 'wms') {
    var createdLayer = new L.TileLayer.WMS(layer.url + '?SERVICE=WMS&', {
      layers: layer.meta.name,
      format: 'image/png',
      transparent: true,
      maxZoom: 20
    }).addTo(map)

    overlays[layer.title] = createdLayer
  }

  map.removeControl(layerControl)
  layerControl = L.control.layers(baseLayers, overlays, {
    collapsed: isCollapsed
  }).addTo(map)
}

map.on('click', function (e) {
  console.log(e.latlng)
// dynLayer.identify(e.latlng, {
//       tolerance: 3, //default is 3
//       layers: 'visible:4',
//       sr:4326
//     }, function(data) {
//   if(data.results.length > 0) {
//     result = data.results[0]
//     popupText =  "<center><b>Zone: </b>"+result.attributes['Zone']+"</center>"
//     if(selection) {map.removeLayer(selection)}
//     selection = L.geoJson(jsonconverter.toGeoJson(result.geometry)).addTo(map)
//     var popup = L.popup()
//         .setLatLng(e.latlng)
//         .setContent(popupText)
//         .openOn(map)
//     selection.bindPopup(popup)
//   }
// })
})

/* Highlight search box text on click */
$('#searchbox').click(function () {
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
