define([
    //'jquery',
    'mustache',
    'text!geobricks_ui_distribution/html/template.html',
    'i18n!geobricks_ui_distribution/nls/translate',
    'fenix-map',
    'highcharts',
    'bootstrap'], function (
    //$,
    Mustache,
    templates,
    translate
) {
    'use strict';

    function GEOBRICKS_UI_DISTRIBUTION() {

        this.CONFIG = {
            lang: 'E',
            // TODO: temporary fix to remove
            langISO2: 'EN',
            placeholder: 'main_content_placeholder',
            template_id: 'map',

            areas: {
                query: "SELECT adm0_code, adm0_name FROM spatial.gaul0_2015_4326 WHERE disp_area = 'NO' ORDER BY adm0_name"
            },

            // default layer and map
            m: null,
            l: null,

            l_gaul0_highlight: null
        }
    }

    GEOBRICKS_UI_DISTRIBUTION.prototype.init = function(config) {
        this.CONFIG = $.extend(true, {}, this.CONFIG, config);

        var template = $(templates).filter('#' + this.CONFIG.template_id).html();
        $('#' + this.CONFIG.placeholder).html(templates);

        this.build_dropdown_products('pgeo_dist_prod')

        //this.build_dropdown_gaul('pgeo_dist_areas')

        // build map
        this.build_map('pgeo_dist_map')
        var _this = this;
        $("#pgeo_dist_export_button").bind( "click", function() {
            var areas = $("#pgeo_dist_areas_select").chosen().val();
            var l = $("#pgeo_dist_layers_select").chosen().val();
            var layers = []
            for( var i=0; i < l.length; i++) {
                var layer = JSON.parse(l[i])
                layers.push({
                    "workspace": layer.workspace,
                    "layerName": layer.layerName,
                    "datasource": layer.datasource
                })
            }
            var email_address = $("#pgeo_dist_email_address").val();
            _this.export_layers(layers, areas, email_address)
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
                    var dsd = JSON.stringify(response[i]["dsd"])
                    //TODO: remove the replace. Do it with the DSD?
                    html += "<option value='" + dsd + "'>" + response[i]['title'][_this.CONFIG.langISO2.toLocaleUpperCase()] + "</option>";
                }
                $('#' + id).append(html);
                $('#' + id).trigger("chosen:updated");

                //$( "#" + id ).change(function () {
                //    _this.on_change_layer(id)
                //});

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

                $( "#pgeo_dist_layers_add_layer").click(function () {
                    _this.on_change_layer(id)
                });
            },
            error : function(err, b, c) {}
        });
    }

    GEOBRICKS_UI_DISTRIBUTION.prototype.on_change_layer = function(id) {
        var values = $("#" + id + ' option:selected');
        if (this.CONFIG.l) {
            this.CONFIG.m.removeLayer(this.CONFIG.l)
        }

        if ( values.length > 0 ) {

            if (values[0].value == '') {
                values.splice(0, 1);
            }

            if (values) {
                var layer = {};
                var l = JSON.parse(values[0].value);
                var workspace = l.workspace
                var layerName = l.layerName
                layer.layers = workspace + ":" + layerName
                layer.layertitle = values[0].text
                layer.urlWMS = this.CONFIG.url_geoserver_wms
                layer.opacity = '0.75';
                layer.defaultgfi = true;
                layer.openlegend = true;
                layer.lang = "EN";

                /* TODO: check if raster */
                layer.customgfi = {
                    content: {
                        /* TODO: change style classes */
                        EN: "<div class='fm-legend-layertitle'><b>"+ layer.layertitle +"</b><div class='fm-popup-join-content'>Pixel Value {{GRAY_INDEX}}</div></div>"
                    },
                    showpopup: true
                }

                this.CONFIG.l = new FM.layer(layer, {noWrap: true});
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
                            var codes = _this.get_string_codes(values, "'")
                            _this.CONFIG.l_gaul0_highlight.layer.cql_filter = "adm0_code IN (" + codes + ")";
                            _this.CONFIG.l_gaul0_highlight.redraw()
                            _this.zoom_to(_this.get_string_codes(values, ""))
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
            guiController: { overlay : true,  baselayer: true,  wmsLoader: false },
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
        layer.layertitle = translate.boundaries;
        layer.urlWMS = "http://fenix.fao.org/geoserver"
        layer.styles = "gaul0_line"
        layer.opacity='0.9';
        layer.zindex= 550;
        this.CONFIG.l_gaul0 = new FM.layer(layer, {noWrap : true});
        this.CONFIG.m.addLayer(this.CONFIG.l_gaul0);
    }


    GEOBRICKS_UI_DISTRIBUTION.prototype.get_string_codes = function(values, apex) {
        var codes= ""
        apex = typeof apex !== 'undefined' ? apex : "'";
        for( var i=0; i < values.length; i++) {
            codes += apex + values[i] + apex+","
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