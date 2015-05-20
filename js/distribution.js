define([
    //'jquery',
    'handlebars',
    'text!geobricks_ui_distribution/html/template.hbs',
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
            datasource: 'faostatdb',

            placeholder: 'main_content_placeholder',
            template_id: 'map',

            datatype_dd_id: 'ghg_spatial_browse_datatype',
            product_dd_id: 'ghg_spatial_browse_product',
            layer_dd_id: 'ghg_spatial_browse_layer',
            date_panel_id: 'ghg_spatial_browse_date_panel',
            date_dd_id: 'ghg_spatial_browse_date',
            country_selector_dd_id: 'ghg_spatial_browse_country',
            map_id: 'ghg_spatial_browse_map',

            // default layer and map
            m: null,
            l: null,
            l_gaul0_highlight: null,

            // caching layers
            cached_layers:null,

            // countries
            url_wds_table_json: "http://faostat3.fao.org/wds/rest/table/json",
            query_countries: "SELECT DISTINCT A.AreaCode AS Code, A.AreaName{{lang}} AS Name FROM DomainAreaList AS DA, Area AS A  WHERE DA.DomainCode = 'QC' AND (A.AreaCode = DA.AreaCode ) AND A.AreaCode IN ('238', '87', '97', '33', '273', '219', '260', '64', '237', '72', '154', '38', '207', '54', '200', '3', '208', '147', '195', '36', '163', '167', '166', '264', '184', '63', '128', '106', '91', '133', '20', '103', '220', '75', '251', '192', '19', '201', '48', '2', '28', '211', '57', '173', '131', '59', '156', '58', '172', '213', '151', '239', '221', '222', '114', '299', '70', '270', '27', '11', '216', '21', '37', '188', '129', '16', '100', '18', '85', '7', '13', '50', '138', '214', '125', '145', '89', '223', '96', '244', '226', '182', '250', '8', '203', '235', '95', '86', '160', '174', '193', '190', '66', '53', '215', '256', '141', '110', '120', '137', '189', '61', '198', '149', '169', '32', '140', '118', '180', '4', '225', '74', '218', '47', '178', '84', '40', '35', '233', '176', '10', '236', '122', '134', '124', '55', '230', '102', '231', '39', '217', '199', '179', '115', '229', '162', '82', '202', '196', '144', '73', '104', '157', '93', '205', '123', '175', '9', '191', '177', '153', '112', '79', '148', '105', '49', '88', '143', '108', '90', '170', '161', '23', '258', '159', '68', '127', '1', '183', '130', '52', '6', '234', '44', '209', '210', '272', '276', '117', '65', '26', '187', '25', '142', '136', '101', '69', '116', '119', '224', '150', '14', '168', '29', '94', '240', '46', '194', '22', '227', '181', '135', '45', '81', '126', '146', '17', '107', '113', '121', '249', '41', '185', '212', '155', '12', '5', '67', '255', '109', '132', '277', '56', '60', '83', '165', '158', '243', '98', '99', '80', '171', '197') AND A.AreaLevel = 5 ORDER BY A.AreaName{{lang}} ASC"
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
            //title: translate.ghg_spatial_browse,
            select_a_datatype: translate.select_a_datatype,
            select_a_product: translate.select_a_product,
            select_a_layer: translate.select_a_layer,
            show_layer: translate.show_layer,
            select_date: translate.select_date,
            select_a_country: translate.select_a_country
        };
        var html = template(dynamic_data);
        $('#' + this.CONFIG.placeholder).html(html);

        // initialize dropdown
        $('#' + this.CONFIG.product_dd_id).chosen({width: '100%'});
        $('#' + this.CONFIG.layer_dd_id).chosen({width: '100%'});
        $('#' + this.CONFIG.date_dd_id).chosen({width: '100%'});

        // buid_datatype_dropdown
        this.build_datatype_dropdown(this.CONFIG.datatype_dd_id, this.CONFIG.data);

        this.renderCountryDropdown(this.CONFIG.country_selector_dd_id);

        // buold map
        this.build_map(this.CONFIG.map_id);
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
        $('#' + id).html(this.buid_dd_html(data));
        $('#' + id).trigger("chosen:updated");
        this.build_layer_dropdown(this.CONFIG.layer_dd_id, []);

        var _this = this;
        $("#" + id).unbind('change');
        $("#" + id).change(function () {
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
        //console.log(data);

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

    GEOBRICKS_UI_DISTRIBUTION.prototype.renderCountryDropdown = function(id) {
        /* REST URL */
        var _this = this;
        //var url = this.CONFIG.url_rest + '/' + this.CONFIG.datasource + '/QC/1/1/' + this.CONFIG.lang_faostat;
        var url = this.CONFIG.url_wds_table_json;
        var template = Handlebars.compile(this.CONFIG.query_countries);
        var dynamic_data = {
            lang: this.CONFIG.lang
        };
        var data = {};
        var sql = {};

        sql.limit = null;
        sql.query = template(dynamic_data);
        sql.frequency = "NONE";
        data.datasource = this.CONFIG.datasource;
        data.thousandSeparator = ',';
        data.decimalSeparator = '.';
        data.json = JSON.stringify(sql);
        $.ajax({
            type: 'POST',
            data : data,
            url: url,
            success: function (response) {
                /* Cast the response to JSON, if needed. */
                var response = (typeof response == 'string')? $.parseJSON(response): response;

                var html = '<option value="null">' + translate.please_select + '</option>';
                for(var i=0; i < response.length; i++) {
                    html += '<option value="' + response[i][0] + '">' + response[i][1] + '</option>';
                }

                // add html
                $('#' + id).html(html);
                $('#' + id).show();
                $('#' + id).chosen();


                $("#" + id).change(function(e, params) {
                    var countryCode = $(this).find(":selected").val();
                    _this.highlightCountry(countryCode);
                });
            },
            error: function (a) {
                swal({title: translate.error, type: 'error', text: a.responseText});
            }
        });
    };

    GEOBRICKS_UI_DISTRIBUTION.prototype.showLayer = function() {
        var layer = $("#" + this.CONFIG.layer_dd_id).find(":selected").data("value");
        var year = $("#" + this.CONFIG.date_dd_id).chosen().val();

        // TODO: check this method
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
        this.CONFIG.m.createMap(25, 0);

        var layer = {};
        layer.layers = "fenix:gaul0_line_3857"
        layer.layertitle = translate.boundaries;
        layer.urlWMS = "http://fenix.fao.org/geoserver"
        layer.styles = "gaul0_line"
        layer.opacity='0.9';
        layer.zindex= 550;
        this.CONFIG.l_gaul0 = new FM.layer(layer, {noWrap : true});
        this.CONFIG.m.addLayer(this.CONFIG.l_gaul0);

        var layer = {};
        layer.layers = "fenix:gaul0_faostat_3857"
        layer.layertitle = "Administrative unit"
        layer.urlWMS = "http://fenix.fao.org/geoserver"
        layer.opacity='0.7';
        layer.zindex= 500;
        layer.style = 'gaul0_highlight_polygon';
        layer.cql_filter="faost_code IN ('0')";
        layer.hideLayerInControllerList = true;
        this.CONFIG.l_gaul0_highlight = new FM.layer(layer, {noWrap : true});
        this.CONFIG.m.addLayer(this.CONFIG.l_gaul0_highlight);


        this.resetZoom(this.CONFIG.m.map)
    };

    GEOBRICKS_UI_DISTRIBUTION.prototype.resetZoom = function(map) {
        (function() {
            var control = new L.Control({position:'topleft'});
            control.onAdd = function(map) {
                var azoom = L.DomUtil.create('a','resetzoom');
                azoom.innerHTML = "<button type='button' class='btn btn-default' style='background-color:#f5f5f5'>Reset Zoom</button>";
                L.DomEvent
                    .disableClickPropagation(azoom)
                    .addListener(azoom, 'click', function() {
                        map.setView(map.options.center, map.options.zoom);
                    },azoom);
                return azoom;
            };
            return control;
        }()).addTo(map);
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

    GEOBRICKS_UI_DISTRIBUTION.prototype.highlightCountry = function(countryCode) {
        if ( countryCode != "world") {
            this.CONFIG.l_gaul0_highlight.layer.cql_filter = "faost_code IN (" + countryCode + ")";
            // TODO: remove hardcoded zoom
            this.CONFIG.m.zoomTo("gaul0_faostat_3857", "faost_code", [countryCode]);
        }

        else {
            this.CONFIG.l_gaul0_highlight.layer.cql_filter = "faost_code IN ('0')";
        }
        this.CONFIG.l_gaul0_highlight.redraw();
    }

    GEOBRICKS_UI_DISTRIBUTION.prototype.getLabel = function(label) {
        return translate[label]? translate[label]: label;
    };

    GEOBRICKS_UI_DISTRIBUTION.prototype.refresh = function() {
        console.log("refresh");
        $('.chosen-container.chosen-container-single').css('width', '100%');
        this.CONFIG.m.invalidateSize();
        console.log(this.CONFIG.m);
        console.log(this.CONFIG.m.invalidateSize);
    };

    return GEOBRICKS_UI_DISTRIBUTION;
});
