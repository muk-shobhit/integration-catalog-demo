// This variation on ForceDirectedLayout does not move any selected Nodes
// but does move all other nodes (vertexes).
function ContinuousForceDirectedLayout() {
    go.ForceDirectedLayout.call(this);
    this._isObserving = false;
}
go.Diagram.inherit(ContinuousForceDirectedLayout, go.ForceDirectedLayout);

/** @override */
ContinuousForceDirectedLayout.prototype.isFixed = function (v) {
    return v.node.isSelected;
}

// optimization: reuse the ForceDirectedNetwork rather than re-create it each time
/** @override */
ContinuousForceDirectedLayout.prototype.doLayout = function (coll) {
    if (!this._isObserving) {
        this._isObserving = true;
        // cacheing the network means we need to recreate it if nodes or links have been added or removed or relinked,
        // so we need to track structural model changes to discard the saved network.
        var lay = this;
        this.diagram.addModelChangedListener(function (e) {
            // modelChanges include a few cases that we don't actually care about, such as
            // "nodeCategory" or "linkToPortId", but we'll go ahead and recreate the network anyway.
            // Also clear the network when replacing the model.
            if (e.modelChange !== "" ||
                (e.change === go.ChangedEvent.Transaction && e.propertyName === "StartingFirstTransaction")) {
                lay.network = null;
            }
        });
    }
    var net = this.network;
    if (net === null) {  // the first time, just create the network as normal
        this.network = net = this.makeNetwork(coll);
    } else {  // but on reuse we need to update the LayoutVertex.bounds for selected nodes
        this.diagram.nodes.each(function (n) {
            var v = net.findVertex(n);
            if (v !== null) v.bounds = n.actualBounds;
        });
    }
    // now perform the normal layout
    go.ForceDirectedLayout.prototype.doLayout.call(this, coll);
    // doLayout normally discards the LayoutNetwork by setting Layout.network to null;
    // here we remember it for next time
    this.network = net;
}
// end ContinuousForceDirectedLayout


function init() {
    /*if (window.goSamples) goSamples();*/  // init for these samples -- you don't need to call this
    var $ = go.GraphObject.make;  // for conciseness in defining templates

    myDiagram =
        $(go.Diagram, "myDiagramDiv",  // must name or refer to the DIV HTML element
            {
                initialAutoScale: go.Diagram.Uniform,  // an initial automatic zoom-to-fit
                contentAlignment: go.Spot.Center,  // align document to the center of the viewport
                layout:
                $(ContinuousForceDirectedLayout,  // automatically spread nodes apart while dragging
                    { defaultSpringLength: 30, defaultElectricalCharge: 100 }),
                // do an extra layout at the end of a move
                "SelectionMoved": function (e) { e.diagram.layout.invalidateLayout(); }
            });

    // dragging a node invalidates the Diagram.layout, causing a layout during the drag
    myDiagram.toolManager.draggingTool.doMouseMove = function () {
        go.DraggingTool.prototype.doMouseMove.call(this);
        if (this.isActive) { this.diagram.layout.invalidateLayout(); }
    }

    // define each Node's appearance
    myDiagram.nodeTemplate =
        $(go.Node, "Auto",  // the whole node panel
            // define the node's outer shape, which will surround the TextBlock
            $(go.Shape, "Circle",
                { fill: "CornflowerBlue", stroke: "black", spot1: new go.Spot(0, 0, 5, 5), spot2: new go.Spot(1, 1, -5, -5) }),
            $(go.TextBlock,
                { font: "bold 10pt helvetica, bold arial, sans-serif", textAlign: "center", maxSize: new go.Size(100, NaN) },
                new go.Binding("text", "text"))
        );
    // the rest of this app is the same as samples/conceptMap.html

    // replace the default Link template in the linkTemplateMap
    myDiagram.linkTemplate =
        $(go.Link,  // the whole link panel
            $(go.Shape,  // the link shape
                { stroke: "black" }),
            $(go.Shape,  // the arrowhead
                { toArrow: "standard", stroke: null }),
            $(go.Panel, "Auto",
                $(go.Shape,  // the label background, which becomes transparent around the edges
                    {
                        fill: $(go.Brush, "Radial", { 0: "rgb(240, 240, 240)", 0.3: "rgb(240, 240, 240)", 1: "rgba(240, 240, 240, 0)" }),
                        stroke: null
                    }),
                $(go.TextBlock,  // the label text
                    {
                        textAlign: "center",
                        font: "10pt helvetica, arial, sans-serif",
                        stroke: "#555555",
                        margin: 4
                    },
                    new go.Binding("text", "text"))
            )
        );

    var integrationcatalogue = myArray[0].d.results;

    var nodeDataArray = [];
    var allUniqueSystems = [];

    var linkDataArray = [];

    //find uniqe source
    integrationcatalogue.forEach(function (item) {
        if (!_isContains(allUniqueSystems, item.Source)) {
            allUniqueSystems.push(
                {
                    Name: item.Source
                })
        }
    });

    //find uniqe target
    integrationcatalogue.forEach(function (item) {
        if (!_isContains(allUniqueSystems, item.Target)) {
            allUniqueSystems.push(
                {
                    Name: item.Target
                })
        }
    });

    allUniqueSystems.forEach(function (system) {
        nodeDataArray.push({ key: system.Name, text: system.Name });

        targetNames = GetTargetNames(system.Name)

        targetNames.forEach(function (targetName) {
            var note = GetReferenceNote(system.Name, targetName)
            linkDataArray.push({ from: system.Name, to: targetName, text: note });
        })
    });

    myDiagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
}

function _isContains(json, value) {
    let contains = false;
    Object.keys(json).some(key => {
        contains = typeof json[key] === 'object' ? _isContains(json[key], value) : json[key] === value;
        return contains;
    });
    return contains;
}

function GetTargetNames(source) {

    var targetNames = [];
    var integrationcatalogue = myArray[0].d.results;

    integrationcatalogue.forEach(function (item) {
        if (item.Source == source) {
            targetNames.push(item.Target);
        }
    });
    return targetNames;
}

function GetReferenceNote(source, target) {
    var referenceNote;
    var integrationcatalogue = myArray[0].d.results;

    integrationcatalogue.forEach(function (item) {
        if (item.Source == source && item.Target == target) {
            referenceNote = item.Contents.results.join(",");
        }
    });
    if (referenceNote == undefined)
    {
        alert()
        return "test";
    }
    else
        return referenceNote;
}

function reload() {
    var text = myDiagram.model.toJson();
    myDiagram.model = go.Model.fromJson(text);
}