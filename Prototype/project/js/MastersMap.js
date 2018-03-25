var sketch; //the current drawing
var draw;
var listener;
var selectionResultObject;
//not used for now
// var orlivkaMapLayer = new ol.layer.Tile({
//     source: new ol.source.TileWMS({
//         url: 'http://localhost:8080/geoserver/wms',
//         params: {'LAYERS': 'Masters:orlivka_full', 'TILED': true},
//         serverType: 'geoserver'
//     })
// });
// orlivkaMapLayer.setOpacity(0.5);
//!not used for now
//
//base map
var freeWorldMapLayer = new ol.layer.Tile({
    source: new ol.source.OSM()
});
//orlivka map
var orlivkaGruntsLayer = new ol.layer.Vector({
    title: 'orlivkaGruntsLayer',
    style: new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(70,70,0,0.4)',
            width: 1
        }),
        fill: new ol.style.Fill({
            color: 'rgba(70,70,0,0.2)'
        })
    }),
    source : new ol.source.Vector({
        url : 'http://localhost:8080/geoserver/Masters/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=Masters:grunt&maxFeatures=50&outputFormat=application%2Fjson',
        format : new ol.format.GeoJSON()
    })
});
var orlivkaRoadsLayer = new ol.layer.Vector({
    title: 'orlivkaRoadsLayer',
    style: new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(0,0,0,0.6)',
            width: 5
        })
    }),
    source : new ol.source.Vector({
        url : 'http://localhost:8080/geoserver/Masters/ows?service=WFS&version=1.1.1&request=GetFeature&typeName=Masters:orlivka_roads&maxFeatures=500&outputFormat=application%2Fjson',
        format : new ol.format.GeoJSON()
    })
});
var orlivkaBuildingsLayer = new ol.layer.Vector({
    title: 'orlivkaBuildingsLayer',
    style: new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(0,0,0,0.9)',
            width: 1
        }),
        fill: new ol.style.Fill({
            color: 'rgba(255,255,255,0.4)'
        })
    }),
    source : new ol.source.Vector({
        url : 'http://localhost:8080/geoserver/Masters/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=Masters:orlivka_landuse&maxFeatures=50&outputFormat=application%2Fjson',
        format : new ol.format.GeoJSON()
    })
});
var orlivkaWaterLayer = new ol.layer.Vector({
    title: 'orlivkaWaterLayer',
    style: new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(70, 163, 254, 0.8)',
            width: 5
        })
    }),
    source : new ol.source.Vector({
        url : 'http://localhost:8080/geoserver/Masters/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=Masters:orlivka_places&maxFeatures=50&outputFormat=application%2Fjson',
        format : new ol.format.GeoJSON()
    })
});
//drawing layer
var drawingSource = new ol.source.Vector({
    useSpatialIndex : false
});
var drawingLayer = new ol.layer.Vector({
    source: drawingSource
});
draw = new ol.interaction.Draw({
    source : drawingSource,
    type : 'Polygon',
    //only draw when Ctrl is pressed.
    condition : ol.events.condition.platformModifierKeyOnly
});
var select = new ol.interaction.Select();
var selectedFeatures = select.getFeatures();

//map construction
var mapView = new ol.View({
    center: ol.proj.fromLonLat([36.22, 46.82]),
    zoom: 8
});
var map = new ol.Map({
    target: 'map',
    renderer : 'canvas',
    layers: [
        freeWorldMapLayer,
        orlivkaGruntsLayer,
        orlivkaBuildingsLayer,
        orlivkaWaterLayer,
        orlivkaRoadsLayer,
        drawingLayer
    ],
    view: mapView
});
map.addInteraction(draw);
map.addInteraction(select);

//actual drawing handler
draw.on('drawstart',function(event){
    drawingSource.clear();
    select.setActive(false);
    selectedFeatures.clear();
},this);
draw.on('drawend', function(event) {
    delaySelectActivate();
    selectedFeatures.clear();
    var polygon = event.feature.getGeometry();
    var polygonCenter = ol.extent.getCenter(polygon.getExtent());
    var selectionCircle = new ol.geom.Circle(polygonCenter, 10000);

    var orlivkaGrunts = getFeatures(orlivkaGruntsLayer, selectionCircle);
    var orlivkaRoads = getFeatures(orlivkaRoadsLayer, selectionCircle);
    var orlivkaBuildings = getFeatures(orlivkaBuildingsLayer, selectionCircle);
    var orlivkaWaters = getFeatures(orlivkaWaterLayer, selectionCircle);

    selectionResultObject = {
        'position': polygonCenter,
        'grunts': orlivkaGrunts,
        'roads': orlivkaRoads,
        'buildings': orlivkaBuildings,
        'waters': orlivkaWaters
    };
    selectFinishCallback(selectionResultObject);
});
function getFeatures(layer, geometry) {
    var result = [];
    var features = layer.getSource().getFeatures();
    for (var i = 0 ; i < features.length; i++){
        if(geometry.intersectsExtent(features[i].getGeometry().getExtent())){
            result.push(features[i]);
            selectedFeatures.push(features[i]);
        }
    }
    return result;
}
function delaySelectActivate(){
    setTimeout(function(){
        select.setActive(true)
    },300);
}

//calculation logic
function selectFinishCallback(selectionResultObject) {
    fillModal(selectionResultObject);
    showModal();
}
function showModal() {
    $('#exampleModal').modal('show');
}

function fillModal(selectionResultObject) {
    var positionX = selectionResultObject.position[0];
    var positionY = selectionResultObject.position[1];
    var gruntName = selectionResultObject.grunts[0].getProperties()['Name'];
    var roduchist = getRoduchist(selectionResultObject.grunts[0].getProperties()['Name']);
    var buildings = selectionResultObject.buildings.length;
    var roads = selectionResultObject.roads.length;
    var waters = selectionResultObject.waters.length;

    $('#modalCoordinateX').text(positionX);
    $('#modalCoordinateY').text(positionY);
    $('#modalGrunt').text(gruntName);
    $('#modalGruntRoduchist').text(roduchist);
    $('#modalBuildings').text(buildings);
    $('#modalRoads').text(roads);
    $('#modalWater').text(waters);
    $('#modalResult').text(calculateResult(buildings, roads, waters, roduchist));
}

function getRoduchist(gruntName) {
    if (gruntName = 'Чорноземи звичайні малогум') {
        return 0.73;
    }
    if (gruntName = 'Чорноземи південні малогум') {
        return 0.66;
    }
    if (gruntName = 'Темно-каштанові залишково-') {
        return 0.59;
    }
}

function calculateResult(buildings, roads, waters, roduchist) {
    var coef = (
        roduchist
        + (buildings == 0 ? 0 : 1 - 1/buildings)
        + (roads == 0 ? 0 : 1 - 1/roads)
        + (waters == 0 ? 0 : 1 - 1/waters)
    ) / 4;
    return coef * 100;
}