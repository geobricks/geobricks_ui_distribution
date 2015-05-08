define([
    //'jquery',
    'handlebars',
    'text!geobricks_ui_distribution/html/template.html',
    'i18n!geobricks_ui_distribution/nls/translate',
    'text!geobricks_ui_distribution/config/data.json',
    'fenix-map',
    'highcharts',
    'bootstrap'], function (
    //$,
    Handlebars,
    templates,
    translate,
    configData
) {
    'use strict';

    function GEOBRICKS_UI_DISTRIBUTION() {

        this.CONFIG = {
            lang: 'E',
            // TODO: temporary fix to remove
            langISO2: 'EN',
            placeholder: 'main_content_placeholder',
            template_id: 'map',

            datatype_dd_id: 'ghg_spatial_browse_datatype',
            product_dd_id: 'ghg_spatial_browse_product',
            layer_dd_id: 'ghg_spatial_browse_layer',
            date_panel_id: 'ghg_spatial_browse_date_panel',
            date_dd_id: 'ghg_spatial_browse_date',
            map_id: 'ghg_spatial_browse_map',

            areas: {
                query: "SELECT adm0_code, adm0_name FROM spatial.gaul0_2015_4326 WHERE disp_area = 'NO' ORDER BY adm0_name"
            },

            // default layer and map
            m: null,
            l: null,

            l_gaul0_highlight: null,


            // caching layers
            cached_layers:null
        }
    }

    GEOBRICKS_UI_DISTRIBUTION.prototype.init = function(config) {
        this.CONFIG = $.extend(true, {}, this.CONFIG, config);
        this.CONFIG.data = $.parseJSON(configData);
        this.render();
    };

    GEOBRICKS_UI_DISTRIBUTION.prototype.render = function() {
        /* Load template. */
        var source =  $(templates).filter('#main_structure').html();
        var template = Handlebars.compile(source);
        var dynamic_data = {
            title: translate.ghg_spatial_browse,
            select_a_datatype: translate.select_a_datatype,
            select_a_product: translate.select_a_product,
            select_a_layer: translate.select_a_layer,
            show_layer: translate.show_layer,
            select_date: translate.select_date
        };
        var html = template(dynamic_data);
        $('#' + this.CONFIG.placeholder).html(html);

        // initialize dropdown
        $('#' + this.CONFIG.product_dd_id).chosen({width: '100%'});
        $('#' + this.CONFIG.layer_dd_id).chosen({width: '100%'});
        $('#' + this.CONFIG.date_dd_id).chosen({width: '100%'});

        // buid_datatype_dropdown
        this.build_datatype_dropdown(this.CONFIG.datatype_dd_id, this.CONFIG.data);

        // buold map
        this.build_map(this.CONFIG.map_id);


/*        var _this =this;
        var request_filter = {
            "meContent.resourceRepresentationType" : {
                "enumeration" : ["geographic"]
            },
            "meContent.seCoverage.coverageSectors" : {
                "codes" : [
                    {
                        "uid" : "layers_products",
                        "version" : "1.0",
                        "codes" : ['gfed4_burnedareas_otherforest']
                    }
                ]
            }
        }
        var url = this.CONFIG.url_d3s_resources_find + "?" + this.CONFIG.url_d3s_resources_find_order_by_date_parameters;
        console.log(url);
        $.ajax({
            type: 'POST',
            url: url,
            contentType: "application/json",
            dataType: 'json',
            data: JSON.stringify(request_filter),
            crossDomain: true,
            success : function(response) {
                console.log(response);
                _this.build_dates_dd(_this.CONFIG.date_dd_id, response)
            },
            error : function(err, b, c) {}
        });*/
    };

    GEOBRICKS_UI_DISTRIBUTION.prototype.build_datatype_dropdown = function(id, data) {
        $('#' + id).html(this.buid_dd_html(data));
        $('#' + id).chosen({
            disable_search_threshold: 7,
            width: '100%'
        });

        var _this = this;
        $("#" + id).change(function() {
            var d = [];
            if ($(this).find(":selected").data("value")) {
                d = $(this).find(":selected").data("value").product;
            }
            _this.build_product_dropdown(_this.CONFIG.product_dd_id, d);
        });
    };

    GEOBRICKS_UI_DISTRIBUTION.prototype.build_product_dropdown = function(id, data) {
        console.log(id);
        console.log(data);
        $('#' + id).html(this.buid_dd_html(data));
        $('#' + id).trigger("chosen:updated");
        this.build_layer_dropdown(this.CONFIG.layer_dd_id, []);

        var _this = this;
        $("#" + id).unbind('change');
        $("#" + id).change(function () {
            console.log("TRIGGER PRODUCT");
            var d = [];
            if ($(this).find(":selected").data("value")) {
                d = $(this).find(":selected").data("value").layer;
            }
            _this.build_layer_dropdown(_this.CONFIG.layer_dd_id, d);
        });
    };

    GEOBRICKS_UI_DISTRIBUTION.prototype.build_layer_dropdown = function(id, data) {
        $('#' + id).html(this.buid_dd_html(data));
        $('#' + id).trigger("chosen:updated");
        this.build_dates_dd(this.CONFIG.date_panel_id, this.CONFIG.date_dd_id, []);

        var _this = this;
        $("#" + id).unbind('change');
        $("#" + id).chosen().change(function() {
            console.log("TRIGGER LAYER");
            var d = [];
            if ($(this).find(":selected").data("value")) {
                d = $(this).find(":selected").data("value").coverageSector;
            }
            _this.build_dates(_this.CONFIG.date_panel_id, _this.CONFIG.date_dd_id, d);
        });
    };

    GEOBRICKS_UI_DISTRIBUTION.prototype.build_dates = function(panel_id, dd_id, coverageSectorCode) {
        var request_filter = {
            "meContent.resourceRepresentationType" : {
                "enumeration" : ["geographic"]
            },
            "meContent.seCoverage.coverageSectors" : {
                "codes" : [
                    {
                        "uid" : "layers_products",
                        "version" : "1.0",
                        "codes": [coverageSectorCode]
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
                // TODO build dropdown or display:none
                console.log(response);

                // caching layers
                _this.CONFIG.cached_layers = response;

                _this.build_dates_dd(panel_id, dd_id, response)
            },
            error : function(err, b, c) {
                console.log("ERROR D3s");
            }
        });
    };

    GEOBRICKS_UI_DISTRIBUTION.prototype.build_dates_dd = function(panel_id, dd_id, data) {
        console.log(data);

        var dates = [];
        for (var i in data) {
            try {
                dates.push(new Date(data[i]["meContent"]["seCoverage"]["coverageTime"]["from"]).getFullYear());
            }catch(e) {}
        }

        if (dates.length > 0) {
            var html = ''
            for(var i=0; i < dates.length; i++) {
                html += '<option value="' + dates[i] + '">' + this.getLabel(dates[i]) + '</option>';
            }
            $('#' + dd_id).html(html);
            $("#" + panel_id).show();
        }
        else {
            $('#' + dd_id).html('<option value="null">' + translate.please_select + '</option>');
            $("#" + panel_id).hide();
        }
        $('#' + dd_id).trigger("chosen:updated");

        var _this = this;
        $("#" + dd_id).unbind('change');
        $("#" + dd_id).change(function(e, params) {
            _this.showLayer();
        });
        this.showLayer();
    };

    GEOBRICKS_UI_DISTRIBUTION.prototype.buid_dd_html = function(data) {
        var html = '<option value="null">' + translate.please_select + '</option>';
        for(var i=0; i < data.length; i++) {
            html += '<option data-value='+ JSON.stringify(data[i]) + '>' + this.getLabel(data[i].title) + '</option>';
        }
        return html;
    };

    GEOBRICKS_UI_DISTRIBUTION.prototype.showLayer = function() {
        console.log("showLayer");

        var layer = $("#" + this.CONFIG.layer_dd_id).find(":selected").data("value");
        var year = $("#" + this.CONFIG.date_dd_id).chosen().val();

        var layerDef = null;
        if (layer) {
            var cached_layers = this.CONFIG.cached_layers;
            if (cached_layers) {
                if (cached_layers.length > 0) {
                    if (layer.layerName) {
                        for (var i in cached_layers) {
                            if (cached_layers[i].dsd.layerName == layer.layerName){
                                layerDef = cached_layers[i];
                                break;
                            }
                        }
                    }

                    else if (year) {
                        var fromDate = new Date(year, 0, 1).getTime();
                        for (var i in cached_layers) {
                            if (cached_layers[i].meContent.seCoverage.coverageTime.from == fromDate){
                                layerDef = cached_layers[i];
                                break;
                            }
                        }
                    }
                }
                else {
                    // TODO: add check
                    layerDef = cached_layers[0];
                }
            }
        }
        this.on_change_layer(layerDef)
    };

    GEOBRICKS_UI_DISTRIBUTION.prototype.build_map = function(id) {
        var options = {
            plugins: { geosearch : false, mouseposition: false, controlloading : false, zoomControl: 'bottomright'},
            guiController: { overlay : true,  baselayer: true,  wmsLoader: false },
            gui: {disclaimerfao: true }
        };

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
    };

    GEOBRICKS_UI_DISTRIBUTION.prototype.on_change_layer = function(layerDef) {
        if (this.CONFIG.l) {
            this.CONFIG.m.removeLayer(this.CONFIG.l)
        }

        if (layerDef) {
            var layer = {};
            layer.layers = layerDef.dsd.workspace + ":" + layerDef.dsd.layerName;
            layer.layertitle = layerDef.title.EN;
            layer.urlWMS = this.CONFIG.url_geoserver_wms;
            layer.opacity = '0.75';
            layer.defaultgfi = true;
            layer.openlegend = true;
            layer.lang = "EN";

            /* TODO: check if raster */
            layer.customgfi = {
                content: {
                    /* TODO: change style classes */
                    EN: "<div class='fm-legend-layertitle'><b>" + layer.layertitle + "</b><div class='fm-popup-join-content'>Pixel Value {{GRAY_INDEX}}</div></div>"
                },
                showpopup: true
            }

            this.CONFIG.l = new FM.layer(layer, {noWrap: true});
            this.CONFIG.m.addLayer(this.CONFIG.l);
        }
    };

    GEOBRICKS_UI_DISTRIBUTION.prototype.getLabel = function(label) {
        return translate[label]? translate[label]: label;
    };

    return GEOBRICKS_UI_DISTRIBUTION;
});