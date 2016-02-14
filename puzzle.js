var properties = [
  {type: 'range', id: "Rows", value: 8, min: 1, max: 10, step: 1},
  {type: 'range', id: "Columns", value: 10, min: 1, max: 10, step: 1}
];

var executor = function(args, success, failure) {
  var params = args[0];
  var rowCount = params.Rows;
  var columnCount = params.Columns;

  var shape = args[1];
  var width = shape.right - shape.left;
  var height = shape.top - shape.bottom;

  // Returns 6 points representing the shape of one edge of a puzzle piece.
  // Point coordinates are expressed as percentage distances across the width
  // and height of the piece.
  var edgeDistributions = function() {
    var randomBetween = function(min, max) {
      return Math.random() * (max - min) + min;
    };

    var baselineOffsets = {
      xMin: 51,
      xMax: 62,
      yMin: -15,
      yMax: 5
    };

    var upperOffsets = {
      xMin: 20,
      xMax: 30,
      yMin: 20,
      yMax: 44
    };

    var point1 = [0, 0];
    var point2 = [
      randomBetween(baselineOffsets.xMin, baselineOffsets.xMax),
      randomBetween(baselineOffsets.yMin, baselineOffsets.yMax)
    ];
    var point3 = [
      randomBetween(upperOffsets.xMin, upperOffsets.xMax),
      randomBetween(upperOffsets.yMin, upperOffsets.yMax)
    ];
    var point4 = [
      randomBetween(100-upperOffsets.xMax, 100-upperOffsets.xMin),
      randomBetween(upperOffsets.yMin, upperOffsets.yMax)
    ];
    var point5 = [
      randomBetween(100-baselineOffsets.xMax, 100-baselineOffsets.xMin),
      randomBetween(baselineOffsets.yMin, baselineOffsets.yMax)
    ];
    var point6 = [100, 0];

    var sign = Math.random() < 0.5 ? -1 : 1;

    return [point1, point2, point3, point4, point5, point6].map(function(p) {
      return [p[0] / 100, p[1] * sign / 100];
    });
  };

  // Builds an m + 1 x n matrix of edge shapes. The first and last rows
  // are straight edges.
  var buildDistributions = function(m, n) {
    var lineGroups = [];
    var lines = [];
    var points, i, j;

    for (j = 0; j < n; j++) {
      lines.push([[0, 0], [1,0]]);
    }
    lineGroups.push(lines);

    for (i = 1; i < m; i++) {
      lines = [];
      for (j = 0; j < n; j++) {
        lines.push(edgeDistributions());
      }
      lineGroups.push(lines);
    }

    lines = [];
    for (j = 0; j < n; j++) {
      lines.push([[0, 0], [1,0]]);
    }
    lineGroups.push(lines);

    return lineGroups;
  };

  var transposePoint = function(point) {
    return [point[1], point[0]];
  };

  var offsetPoint = function(point, columnIndex, rowIndex, columnWidth, rowHeight) {
    var offsetColumnPosition = function(percent, columnWidth, columnIndex) {
      var columnOffset = columnWidth * columnIndex + shape.left;
      return percent * columnWidth + columnOffset;
    };

    var offsetRowPosition = function(percent, rowHeight, rowIndex) {
      var rowOffset = rowHeight * rowIndex + shape.bottom;
      return percent * rowHeight + rowOffset;
    };

    var x = offsetColumnPosition(point[0], columnWidth, columnIndex);
    var y = offsetRowPosition(point[1], rowHeight, rowIndex);

    return [x, y];
  };

  var offsetPoints = function(lineGroups, offsetter) {
    for (var i=0; i<lineGroups.length; i++) {
      var lines = lineGroups[i];
      for (var j=0; j<lines.length; j++) {
        lines[j] = lines[j].map(function(point) {
          return offsetter(point, j, i);
        });
      }
    }
  };

  var buildPieces = function() {
    var rowHeight = height / rowCount;
    var columnWidth = width / columnCount;
    var pieces = [];

    var rows = buildDistributions(rowCount, columnCount);
    offsetPoints(rows, function(point, j, i) {
      return offsetPoint(point, j, i, columnWidth, rowHeight);
    });

    var columns = buildDistributions(columnCount, rowCount);
    offsetPoints(columns, function(point, j, i) {
      return offsetPoint(transposePoint(point), i, j, columnWidth, rowHeight);
    });

    for (var rowIndex = 1; rowIndex <= rowCount; rowIndex++) {
      for (var columnIndex = 0; columnIndex < columnCount; columnIndex++) {
        var edges = [];
        edges.push(rows[rowIndex - 1][columnIndex]);
        edges.push(columns[columnIndex + 1][rowIndex - 1]);
        edges.push(rows[rowIndex][columnIndex]);
        edges.push(columns[columnIndex][rowIndex - 1]);

        pieces.push(edges);
      }
    }

    return pieces;
  };

  var buildPiecePaths = function() {
    var pieces = buildPieces();
    var d3Line = d3_shape.line().curve(d3_shape.curveBasis);

    return pieces.map(function(piece) {
      var pieceData = piece.map(function(edge) {
        return d3Line(edge);
      }).join(" ");
      return svg.strokePath(pieceData, "#000");
    });
  };

  var buildShapePaths = function() {
    var d3Line = d3_shape.line();

    var shapeData = shape.pointArrays.map(function(pointArray) {
      return d3Line(pointArray.map(function(point) {
        // Invert shape vertically
        return [point[0], shape.top - point[1] + shape.bottom];
      }));
    }).join(" ");
    return svg.fillPath(shapeData, "#999");
  }

  // SVG helpers
  var svg = {
    header: '<?xml version="1.0" standalone="no"?>',
    openTag: '<svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="' + width + 'in" height="' + height + 'in"' +
               ' viewBox="' + shape.left + ' ' + shape.bottom + ' ' + width + ' ' + height + '">',
    closeTag: '</svg>',
    fillPath: function(pathData, color) {
      return '<path stroke-width="1" stroke="' + color + '" fill="' + color + '" vector-effect="non-scaling-stroke" d="' + pathData + '"/>';
    },
    strokePath: function(pathData, color) {
      return '<path stroke-width="1" stroke="' + color + '" vector-effect="non-scaling-stroke" fill="none" d="' + pathData + '"/>';
    }
  };

  success([
    svg.header,
    svg.openTag,
    buildShapePaths(),
    buildPiecePaths().join(""),
    svg.closeTag
  ].join(""));
};

