define([
    //'jquery',
    'mustache',
    'text!geobricks_ui_distribution/html/template.html',
    //'FNX_MAPS_LOADING_WINDOW',
    'fenix-map',
    'highcharts',
    'bootstrap'], function (
    //$,
    Mustache,
    templates
    //loadingWindow
) {

    'use strict';

    var global = this;
    function GEOBRICKS_UI_DISTRIBUTION() {

        this.CONFIG = {
            lang: 'EN',
            placeholder: 'main_content_placeholder',
            template_id: 'map',

            areas: {
                query: "SELECT adm0_code, adm0_name FROM spatial.gaul0_2014_2013_3857 WHERE disp_area = 'NO' ORDER BY adm0_name"
            },

            // default layer and map
            m: null,
            l: null,

            l_gaul0_highlight: null,

            // distribution query
            spatial_query: '{ "query_extent" : "SELECT ST_AsGeoJSON(ST_Transform(ST_SetSRID(ST_Extent(geom), 3857), {{SRID}})) FROM {{SCHEMA}}.gaul0_2014_2013_3857 WHERE adm0_code IN ({{CODES}})", "query_layer" : "SELECT * FROM {{SCHEMA}}.gaul0_2014_2013_3857 WHERE adm0_code IN ({{CODES}})"}'
        }
    }


    GEOBRICKS_UI_DISTRIBUTION.prototype.init = function(config) {
        this.CONFIG = $.extend(true, {}, this.CONFIG, config);

        //loadingWindow = new loadingWindow()

        var template = $(templates).filter('#' + this.CONFIG.template_id).html();
        $('#' + this.CONFIG.placeholder).html(templates);

        this.build_dropdown_products('pgeo_dist_prod')

        this.build_dropdown_gaul('pgeo_dist_areas')

        // build map
        this.build_map('pgeo_dist_map')
        var _this = this;
        $("#pgeo_dist_export_button").bind( "click", function() {
            var areas = $("#pgeo_dist_areas_select").chosen().val();
            var uids =  $("#pgeo_dist_layers_select").chosen().val();
            if ( uids[0] == "") uids.splice(0, 1)
            var codes = _this.get_string_codes(areas)
            var email_address = $("#pgeo_dist_email_address").val();
            _this.export_layers(uids, codes, email_address)
        });
    }

    GEOBRICKS_UI_DISTRIBUTION.prototype.build_dropdown_products = function(id) {
        var url = this.CONFIG.url_d3s_metadata_resource.replace("{{UID}}", "layer_products");
        var _this = this;
        $.ajax({
            type : 'GET',
            url : url,
            success : function(response) {
                response = (typeof response === 'string')? $.parseJSON(response): response;
                var dropdowndID = id + "_select";
                var html = '<select id="'+ dropdowndID+'" style="width:100%;">';
                html += '<option value=""></option>';
                for(var i=0; i < response.data.length; i++) {
                    html += '<option value="' + response.data[i].code + '">' + response.data[i].title["EN"] + '</option>';
                }
                html += '</select>';

                $('#' + id).empty();
                $('#' + id).append(html);

                try {
                    $('#' + dropdowndID).chosen(
                        {
                            disable_search_threshold:6,
                            width: '100%',
                            placeholder_text_single: "Select a product"
                        });
                }  catch (e) {}

                $( "#" + dropdowndID ).change(function () {
                    _this.build_dropdown_layers("pgeo_dist_layers_select",$(this).val())
                });
            },
            error : function(err, b, c) {}
        });
    }

    GEOBRICKS_UI_DISTRIBUTION.prototype.build_dropdown_layers = function(id, product) {
        $("#" + id).empty()
        var request_filter = {
            "meContent.resourceRepresentationType" : {
                "enumeration" : ["geographic"]
            },
            "meContent.seCoverage.coverageSectors" : {
                "codes" : [
                    {
                        "uid" : "layer_products",
                        "version" : "1.0",
                        "codes" : [product]
                    }
                ]
            }
        }
        var url = this.CONFIG.url_d3s_resources_find + "?" + this.CONFIG.url_d3s_resources_find_order_by_date_parameters;
        var _this = this;
        $.ajax({
            type: 'POST',
            url: url,
            contentType: "application/json",
            dataType: 'json',
            data: JSON.stringify(request_filter),
            crossDomain: true,
            success : function(response) {
                response = (typeof response == 'string')? $.parseJSON(response): response;
                var html = '<option value=""></option>';
                for(var i=0; i < response.length; i++) {
                    console.log(response[i]);
                    //TODO: remove the replace. Do it with the DSD?
                    html += '<option value="' + response[i].uid.replace('@',":") + '">' + response[i].title[_this.CONFIG.lang.toLocaleUpperCase()] + '</option>';
                }
                $('#' + id).append(html);
                $('#' + id).trigger("chosen:updated");

                $( "#" + id ).change(function () {
                    _this.on_change_layer(id)
                });

                var select_all = id.replace("_select", "_select_all")
                var deselect_all = id.replace("_select", "_deselect_all")
                $("#"+ select_all ).bind("click", function() {
                    $("#" + id + ">option").prop('selected', true);
                    $('#' + id).trigger("chosen:updated");
                    _this.on_change_layer(id)
                });

                $("#" + deselect_all).bind("click", function() {
                    $("#" + id + ">option").prop('selected', false);
                    $('#' + id).trigger("chosen:updated");
                    _this.on_change_layer(id)
                });
            },
            error : function(err, b, c) {}
        });
    }

    GEOBRICKS_UI_DISTRIBUTION.prototype.on_change_layer = function(id) {
        console.log(id);
        var values = $("#" + id + ' option:selected');
        console.log(values);

        if (this.CONFIG.l) {
            this.CONFIG.m.removeLayer(this.CONFIG.l)
        }

        if ( values.length > 0 ) {

            if (values[0].value == '') {
                console.log(values[0]);
                values.splice(0, 1);
            }

            for (var i = 0; i < values.length; i++) {
                console.log(values[i].text + " ||| " + values[i].value);
            }

            if (values) {
                var layer = {};
                layer.layers = values[0].value
                layer.layertitle = values[0].text
                layer.urlWMS = this.CONFIG.url_geoserver_wms
                layer.opacity = '0.75';
                layer.defaultgfi = true;
                layer.openlegend = true;
                this.CONFIG.l = new FM.layer(layer, this.CONFIG.m, {noWrap: true});
                this.CONFIG.m.addLayer(this.CONFIG.l);
            }
        }
    }

    GEOBRICKS_UI_DISTRIBUTION.prototype.build_dropdown_gaul = function(id) {
        var query = this.CONFIG.areas.query;
        var url = this.CONFIG.url_spatialquery_db_spatial + query;
        var _this = this;
        $.ajax({
            type : 'GET',
            url : url,
            success : function(response) {
                response = (typeof response == 'string')? $.parseJSON(response): response;
                var dropdowndID = id + "_select"
                var html = '<select id="'+ dropdowndID+'"  multiple="" style="width:100%;">';
                html += '<option value="world">World</option>';
                for(var i=0; i < response.length; i++) {
                    html += '<option value="' + response[i][0] + '">' + response[i][1] + '</option>';
                }
                html += '</select>';

                $('#' + id).empty();
                $('#' + id).append(html);

                try {
                    $('#' + dropdowndID).chosen(
                        {
                            disable_search_threshold:6,
                            width: '100%',
                            placeholder_text_multiple: "Select a country"
                        });
                }  catch (e) {}

                $( "#" + dropdowndID ).change(function () {
                    var values = $(this).val()
                    if ( values ) {
                        if ( $(this).val() != "world") {
                            var codes = _this.get_string_codes(values)
                            _this.CONFIG.l_gaul0_highlight.layer.cql_filter = "adm0_code IN (" + codes + ")";
                            _this.CONFIG.l_gaul0_highlight.redraw()
                            _this.zoom_to(codes)
                        }
                    }
                    else {
                        _this.CONFIG.l_gaul0_highlight.layer.cql_filter = "adm0_code IN ('0')";
                        _this.CONFIG.l_gaul0_highlight.redraw()
                        // TODO: reset zoom
                    }
                });
            },
            error : function(err, b, c) {}
        });
    }

    GEOBRICKS_UI_DISTRIBUTION.prototype.build_map = function(id) {
        var options = {
            plugins: { geosearch : false, mouseposition: false, controlloading : false, zoomControl: 'bottomright'},
            guiController: { overlay : true,  baselayer: true,  wmsLoader: true },
            gui: {disclaimerfao: true }
        }

        var mapOptions = {
            zoomControl:false,
            attributionControl: false,
            minZoom: 1,
            tileLayer: {
                // This map option disables world wrapping. by default, it is false.
                continuousWorld: false,
                // This option disables loading tiles outside of the world bounds.
                noWrap: true
            },
            continuousWorld : false,
            noWrap: true
        };
        this.CONFIG.m = new FM.Map(id, options, mapOptions);
        this.CONFIG.m.createMap();

        var layer = {};
        layer.layers = "fenix:gaul0_line_3857"
        layer.layertitle = "Boundaries"
        layer.urlWMS = "http://fenixapps2.fao.org/geoserver-demo"
        layer.styles = "gaul0_line"
        layer.opacity='0.9';
        layer.zindex= 550;
        this.CONFIG.l_gaul0 = new FM.layer(layer, this.CONFIG.m, {noWrap : true});
        this.CONFIG.m.addLayer(this.CONFIG.l_gaul0);

        var layer = {};
        layer.layers = "gaul0_3857"
        layer.layertitle = "Administrative unit1"
        layer.urlWMS = this.CONFIG.url_geoserver_wms
        layer.opacity='0.7';
        layer.zindex= 500;
        layer.style = 'gaul0_highlight_polygon';
        layer.style = 'gaul0_highlight_polygon';
        layer.cql_filter="adm0_code IN (0)";
        layer.hideLayerInControllerList = true;
        this.CONFIG.l_gaul0_highlight = new FM.layer(layer, this.CONFIG.m, {noWrap : true});
        this.CONFIG.m.addLayer(this.CONFIG.l_gaul0_highlight);
    }

    GEOBRICKS_UI_DISTRIBUTION.prototype.collector_to_build_stats = function() {
        var gaul = $("#ew_drowdown_gaul_select").chosen().val();
        var threshold = $("#ew_threshold").val();
        // TODO: check threshold
        // TODO: function
        if ( this.CONFIG.l.layer.layers && gaul.length > 0) {
            build_stats(this.CONFIG.l.layer.layers, gaul, threshold, "ew_stats")
        }
    }

    GEOBRICKS_UI_DISTRIBUTION.prototype.export_layers = function(uids, codes, email_address) {
        //loadingWindow.showPleaseWait()

        if ( codes == "'world'") {
            var url = this.CONFIG.url_distribution_download_raster.replace(/{{LAYERS}}/gi, uids)
           // loadingWindow.hidePleaseWait()
            window.open(url, '_blank');
        }
        else {
            var url = this.CONFIG.url_distribution_rasters_spatial_query;
            //url = url.replace(/{{LAYERS}}/gi, uids)
            var spatial_query = this.CONFIG.spatial_query;
            spatial_query = spatial_query.replace(/{{CODES}}/gi, codes);
            //url = url.replace(/{{SPATIAL_QUERY}}/gi, spatial_query);
            var data = {
                "raster": {
                    "uids": uids
//                        ,"ftp_uids": ["fenix|maize_area1_4326"]
                },
                "vector": spatial_query
            }
            // TODO: check if is a valid email address
            if (email_address != "") {
                data.email_address = email_address
            }
            console.log(url);
            console.log(spatial_query);
            $.ajax({
                type: 'POST',
                url: url,
                data: JSON.stringify(data),
                contentType: 'application/json;charset=UTF-8',
                success: function (response) {
                    //loadingWindow.hidePleaseWait()
                    response = (typeof response == 'string') ? $.parseJSON(response) : response;
                    window.open(response.url, '_blank');
                },
                error: function (err, b, c) {
                    //loadingWindow.hidePleaseWait()
                    console.log(err);
                }
            });
        }
    }

    GEOBRICKS_UI_DISTRIBUTION.prototype.zoom_to = function(codes) {
        var query = "SELECT ST_AsGeoJSON(ST_Transform(ST_SetSRID(ST_Extent(geom), 3857), 4326)) FROM spatial.gaul0_2014_2013_3857 WHERE adm0_code IN ("+ codes +")"
        var url = this.CONFIG.url_spatialquery_db_spatial
        url += query;
        var _this = this;
        $.ajax({
            type : 'GET',
            url : url,
            success : function(response) {
                response = (typeof response == 'string')? $.parseJSON(response): response;
                var polygon = $.parseJSON(response[0][0])
                var coordinates = polygon.coordinates;
                var minlat = coordinates[0][0][1]
                var minlon = coordinates[0][0][0]
                var maxlat = coordinates[0][1][1]
                var maxlon = coordinates[0][2][0]
                _this.CONFIG.m.map.fitBounds([
                    [minlat, minlon],
                    [maxlat, maxlon]
                ]);
            },
            error : function(err, b, c) {
                alert(err)
            }
        });
    }

    GEOBRICKS_UI_DISTRIBUTION.prototype.get_string_codes = function(values) {
        var codes= ""
        for( var i=0; i < values.length; i++) {
            codes += "'"+ values[i] +"',"
        }
        return codes.substring(0, codes.length - 1);
    }

    GEOBRICKS_UI_DISTRIBUTION.prototype.get_string_uids = function(values) {
        var codes= ""
        for( var i=0; i < values.length; i++) {
            codes += "" + values[i] +","
        }
        return codes.substring(0, codes.length - 1);
    }

    return GEOBRICKS_UI_DISTRIBUTION;
});