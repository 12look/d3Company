;(function( window ) {

  'use strict';

  /**
   * Конструктор
   */
  function d3Company( containerEl, data ) {
    this.data = data;
    this.containerEl = containerEl;
    this.width = 1920;
    this.height = 1000;
    this._init();
  }

  /**
   * Основной метод
   */
  d3Company.prototype._init = function() {

    // Основные настройки лейаута
    this.force = d3.layout.force()
                .size([this.width, this.height])
                .charge(function(d) { return -1000; })
                .linkDistance(function(d) { return d.target._children ? 100 : 200; })
                .on("tick", function() {
                      this.link.attr("x1", function(d) { return d.source.x; })
                        .attr("y1", function(d) { return d.source.y; })
                        .attr("x2", function(d) { return d.target.x; })
                        .attr("y2", function(d) { return d.target.y; });

                      this.node.attr("transform", function(d){ return "translate(" + d.x + "," + d.y + ")"; });
                    }.bind(this));

    this.svg = d3.select(this.containerEl).append("svg")
              .attr("width", this.width)
              .attr("height", this.height);

    this.link = this.svg.selectAll(".link");
    this.node = this.svg.selectAll("g.node");

    this.data.fixed = true;
    this.data.x = this.width / 2;
    this.data.y = this.height / 2 + 200;

    this.flatten(this.data);
    this.setParents(this.data, null);
    this.collapseAll(this.data);
    
    this.data.children = this.data._children;
    this.data._children = null;
    
    this.update();
  }

  d3Company.prototype.update = function() {
    var nodes = this.flatten(this.data),
        links = d3.layout.tree().links(nodes);

    // Стартуем force layout.
    this.force
        .nodes(nodes)
        .links(links)
        .start();

    // Обновляем данные ребер
    this.link = this.link.data(links, function(d) { return d.target.id; });

    this.link.exit().remove();

    // Добавляем новые ребра
    this.link.enter().insert("line", ".node")
        .attr("class", "link")
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    // Обновляем данные вершин
    this.node = this.node.data(nodes, function(d) { return d.id; }).style("fill", this.color);

    this.node.exit().remove();
    
    // Добавляем вершины
    var nodeEnter = this.node.enter().append("svg:g")
        .attr("class", function(d) { return d.children || d._children ? "node" : "node child" })
        .style("fill", this.color)
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .on("click", this.click.bind(this))
        .call(this.force.drag);
   
    // Добавляем заголовки
    nodeEnter
        .append("text")
        .attr("class", "title")
        .text(function(d) { return d.name; })
        .attr("y", function(d){ return d.children || d._children ? -15 : -30; });;

    // Добавляем круги
    nodeEnter.append("svg:circle")
        .attr("r", function(d) { return d.children || d._children ? 10 : 25; });
   
     
    // Добавляем картинки
    var images = nodeEnter.append("svg:image")
          .attr("xlink:href",  function(d) { return d.children || d._children ? '' : "circle.png"})
          .attr("class", function(d) { return d.children || d._children ? '' : "child" })
          .attr("x", function(d) { return -20;})
          .attr("y", function(d) { return -20;})
          .attr("height", 40)
          .attr("width", 40);

    // Вешаем события на вершины с картинкой (в нашем случае сотрудники)
    d3.selectAll("image.child").on( "click", function (d) {
              var parent = d3.select(this.parentNode);

              if (parent.classed("active")) {
                parent.select("text.title")
                  .transition()
                  .style("opacity", "1");

                parent.select("circle")
                  .transition()
                  .style("stroke", "#f9c535")
                  .style("stroke-width", "1.5");
                parent.select("rect").transition().attr("width", 0).attr("height", 0).remove();
                parent.selectAll("text.info").remove();
                parent.classed("active", false);
              }
              else {
                parent.select("circle")
                  .transition()
                  .style("stroke", "#d72323")
                  .style("stroke-width", "5")
                
                parent.select("text.title")
                  .transition()
                  .style("opacity", "0");

                // Добавляем прямоугольник
                var rect = parent
                  .classed("active", true)
                  .append("rect")
                  .attr("x", 40)
                  .attr("y", -40)
                  .attr("rx", 10)
                  .attr("ry", 10)
                  .attr("width", 0)
                  .attr("height", 0);
                rect.transition()
                  .attr("width", 120)
                  .attr("height", 80);
                
                // Текст
                parent
                  .append("text")
                  .attr("class", "info")
                  .attr("x", 100)
                  .attr("y", -15)
                  .text(function(d) { return d.name; })
                  .style("opacity", 0)
                  .transition()
                  .style("opacity", 1)
                  .duration(1000);
                parent
                  .append("text")
                  .attr("class", "info")
                  .attr("x", 100)
                  .attr("y", 5)
                  .text(function(d) { return d.last_name; })
                  .style("opacity", 0)
                  .transition()
                  .style("opacity", 1)
                  .duration(1000);
                parent
                  .append("text")
                  .attr("class", "info")
                  .attr("x", 100)
                  .attr("y", 25)
                  .text(function(d) { return d.age; })
                  .style("opacity", 0)
                  .transition()
                  .style("opacity", 1)
                  .duration(1000);
              }
           })

    var that = this;
    nodeEnter
      .on("mouseover", function(d) {
        
        // Выводим на передний план
        that.svg.selectAll("g").sort(function (a, b) {
          if (a.id != d.id) return -1;               // a is not the hovered element, send "a" to the back
          else return 1;                             // a is the hovered element, bring "a" to the front
        });

        d3.select(this).select("text.title")
          .transition()
          .style("font-size", "18px")
          .style("font-weight", "bold")
          .style("fill", "red");
        d3.select(this).select("circle")
          .transition()
          .style("stroke-width", "5");
      })
      .on("mouseout", function(){ 
        if(!d3.select(this).classed("active")) {
          d3.select(this).select("circle")
            .transition()
            .style("stroke-width", "1.5"); 
        }
        d3.select(this).select("text.title")
          .transition()
          .style("font-size", "16px")
          .style("font-weight", "normal")
          .style("fill", "black");
      });
  }

  // Выбор цвета вершины
  d3Company.prototype.color = function( d ) {
    return d._children ? "#334854" : d.children ? "#d72323" : "#fff";
  }

  // Переключатель по клику на вершину
  d3Company.prototype.click = function(d) {
    if (d3.event.defaultPrevented) return; // ignore drag
    if (d.children) {
        this.collapseAll(d);
    } else {
        if (d._parent){
            d._parent.children.forEach(function(e){
                if (e != d){
                    this.collapseAll(e);
                }
            }.bind(this));
        }
      d.children = d._children;
      d._children = null;
    }
    this.update();
  }

  d3Company.prototype.collapseAll = function(d){
    if (d.children){
        d.children.forEach(this.collapseAll.bind(this));
        d._children = d.children;
        d.children = null;
    }
    else if (d._childred){
        d._children.forEach(this.collapseAll.bind(this));
    }
  }

  // Возвращает список всех вершин с айдишниками
  d3Company.prototype.flatten = function(root) {
    var nodes = [], i = 0;

    function recurse(node) {
      if (node.children) node.children.forEach(recurse);
      if (!node.id) node.id = ++i;
      nodes.push(node);
    }

    recurse(root);
    return nodes;
  }

  // Присваивание родителей
  d3Company.prototype.setParents = function(d, p){
    d._parent = p;
    if (d.children) {
        d.children.forEach(function(e){ this.setParents(e,d);}.bind(this));
    } else if (d._children) {
        d._children.forEach(function(e){ this.setParents(e,d);}.bind(this));
    }
  }

  window.d3Company = d3Company; // закидываем в глобальный объект

})( window );