/**
 * Komponents framework
 * 
 * @author Fernando Gabrieli
 * @email fgabrieli at gmail dot com
 */

window.komp = {
    // component controller
    controller : {},

    compiler : {},
    
    init : function(component) {
        this.compiler = new komp.Compiler();

        var $componentEl = $(component);
        var controllerExpr = $componentEl.attr('controller');
        var controller = eval(controllerExpr);

        controller.component = component;
        controller.$componentEl = $componentEl;

        controller.init();

        var t = this;
        $.when(this.setupTemplate(controller)).then(function(template) {
            controller.template = template;
            
            controller.compile = function() {
                var rootScope = new komp.Scope(controller);
                t.compiler.compile($componentEl, rootScope);
            }
            
            controller.compile();
        })
    },

    /**
     * @returns promise
     */
    setupTemplate : function(controller) {
        var d = $.Deferred();

        if (controller.templateUrl) {
            $.when($.get(controller.templateUrl)).then(function(tpl) {
                setTemplate($(tpl));
                d.resolve();
            });
        } else {
            var $tpl = $(controller.template);
            setTemplate($tpl);
        }

        var t = this;

        function setTemplate($tpl) {
            controller.$componentEl.append($tpl);

            d.resolve();
        }

        return d;
    },
}

komp.Scope = function(parentScope) {
    var scope = function() {
    }

    scope.prototype = Object.create(parentScope);

    return new scope();
}

komp.Compiler = function() {
    this.compile = function($el, scope) {
        this.eval($el, scope);

        var t = this;
        $el.children().each(function(i, el) {
            t.compile($(el), scope);
        })
    }

    this.eval = function($el, scope) {
        var t = this;

        // console.log('evaluating', $el.html(), 'scope: ', scope);

        if (hasFor($el) && !isForCompiled($el)) {

            var newScope = new komp.Scope(scope);

            var expr = $el.attr('kfor');
            var parsedFor = expr.match(/(.*)\s+?in\s+?(.*)/);
            var indexName = parsedFor[1];
            var sourceName = parsedFor[2];
            var items = scope[sourceName];

            applyFor.call(this, indexName, items, $el, scope);
        }

        if (hasVariables($el)) {
            $el = setVariables($el, scope);
        }

        if (hasIf($el)) {
            var condition = $el.attr('kIf');

//            var parts = condition.match(/(.*?)\s+?([=|<|>|!|>=|<=|]+)\s+?(.*)/);
//            if (parts == null) {
//            } else {
//                var conditionType = parts[2];
//
//                evalProposition(parts[1]);
//            
//                evalProposition(parts[3]);
//                
//                var condition = 
//            }
            
            var result = jsEval(evalCondition(condition), scope);

            console.log(condition);

            if (result === false) {
                $el.css('display', 'none');
            }
        }
    }

    function evalCondition(condition) {
        var parts = condition.match(/(.*?)\s+?([=|<|>|!|>=|<=|]+)\s+?(.*)/);
        if (parts != null) {
            return evalCondition(parts[1]) + parts[2] + evalCondition(parts[3]);
        }

        if (isFunction(condition)) {
            var parts = condition.match(/(.*)\((.*)+\)$/);
            var funcName = parts[1];
            var params = parts[2].split(',');
            for (var i = 0; i < params.length; i++) {
                var param = params[i];
                condition = condition.replace(param, 'this.' + param.trim());
            }
        } 
        
        if (!isLiteral(condition)) {
            condition = 'this.' + condition;
        }

        return condition;
    }

    function isFunction(prop) {
        return /(.*)\((.*)+\)$/.test(prop);
    }

    function isLiteral(expr) {
        try {
            var evaled = eval(expr);

            return (typeof evaled).indexOf['object', 'function'] != -1;
        } catch (e) {
            return false;
        }
    }

    function jsEval(expr, scope) {
        return function(expr) {
            return eval(expr);
        }.call(scope, expr);
    }

    function setVariables($el, scope) {
        var html = elToHtml($el);
        var variables = html.match(/{(.*?)}/g);

        var replaced = false;

        for (var i = 0; i < variables.length; i++) {
            var symbol = variables[i];
            value = scope[symbol.replace(/{|}/g, '')];
            if (value) {
                html = html.replace(variables[i], value);
                replaced = true;
            }
        }

        var $newElement = false;
        if (replaced) {
            $newElement = $(html).replaceAll($el);
        }

        return $newElement ? $newElement : $el;
    }

    function hasIf($el) {
        return $el[0].hasAttribute('kIf');
    }

    function hasVariables($el) {
        var html = elToHtml($el);
        return /{.*}/.test(html);
    }

    function elToHtml($el) {
        return $('<div>').append($el.clone()).html();
    }

    function hasFor($el) {
        return $el[0].hasAttribute('kFor');
    }

    function isForCompiled($el) {
        return $el[0].hasAttribute('kFor-compiled');
    }

    function applyFor(indexName, items, $el, scope) {
        var newScope = new komp.Scope(scope);

        $el.attr('kFor-compiled', true);

        for (var i = 0; i < items.length; i++) {
            newScope[indexName] = items[i];

            var $newEl = $el.clone();

            this.eval($newEl, newScope);

            var t = this;
            $newEl.children().each(function(i, childEl) {
                t.eval($(childEl), newScope);
            })

            console.log(elToHtml($newEl));

            $newEl.insertBefore($el);

        }

        $el.remove();
    }

}