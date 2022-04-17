import Sigma from "sigma";
import Graph from "graphology";
import circular from "graphology-layout/circular";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { Coordinates, EdgeDisplayData, NodeDisplayData } from "sigma/types";
import axios from "axios";

axios.get('http://94.74.84.89:10400/mk')
  .then(function (response) {

    const loader = document.getElementById("loader") as HTMLElement;
    const container = document.getElementById("sigma-container") as HTMLElement;

    const subjects: string[] = response.data.From;
    const verbs: string[] = response.data.Verb;
    const objects: string[] = response.data.To;

    const graph: Graph = new Graph();

    for (let i = 0; i <= subjects.length - 1; i++) {
      const subject = subjects[i]
      const verb = verbs[i]
      const object = objects[i]

      graph.mergeNode(subject, { label: subject, color: "#674ea7" });
      graph.mergeNode(object, { label: object, color: "#ff3c2a" });
      graph.mergeEdge(subject, object, { weight: 1, label: verb, type: "arrow", size: 1, color: "#5b5b5b" });
    }

    const degrees = graph.nodes().map((node) => graph.degree(node));
    const minDegree = Math.min(...degrees);
    const maxDegree = Math.max(...degrees);
    const min_nodes=2;
    const max_potential_nodes=100;
    let maxSize = 20;
    let minSize = 2.75;

    graph.forEachNode((node) => {
      const degree = graph.degree(node);
      graph.setNodeAttribute(
        node,
        "size",
        minSize + ((degree - minDegree) / (maxDegree - minDegree)) * (maxSize - minSize),
      );
    });

    circular.assign(graph);
    const settings = forceAtlas2.inferSettings(graph);
    forceAtlas2.assign(graph, { settings, iterations: 600 });

    loader.style.display = "none";

    //Sigma here
    const renderer = new Sigma(graph, container, {
      renderEdgeLabels: true, minCameraRatio: 0.05,
      maxCameraRatio: 4, defaultEdgeColor: "#741b47", labelFont: "Arial", labelSize: 14,
      labelColor: { color: "#741b47" }, edgeLabelFont: "Arial", edgeLabelSize: 14,
      edgeLabelColor: { color: "#741b47" }
    });

    interface State {
      hoveredNode?: string;
      searchQuery: string;
      hoveredNeighbors?: Set<string>;
    }
    const state: State = { searchQuery: "" };

    function setHoveredNode(node?: string) {
      if (node) {
        state.hoveredNode = node;
        state.hoveredNeighbors = new Set(graph.neighbors(node));
        renderer.setSetting("labelRenderedSizeThreshold", 0);
      } else {
        state.hoveredNode = undefined;
        state.hoveredNeighbors = undefined;
        renderer.setSetting("labelRenderedSizeThreshold", +8.5);
      }

      renderer.refresh();
    }

    renderer.on("enterNode", ({ node }) => {
      setHoveredNode(node);
    });
    renderer.on("leaveNode", () => {
      setHoveredNode(undefined);
    });

    renderer.setSetting("nodeReducer", (node, data) => {
      const res: Partial<NodeDisplayData> = { ...data };

      if (state.hoveredNeighbors && !state.hoveredNeighbors.has(node) && state.hoveredNode !== node) {
        res.label = "";
        res.color = "#f6f6f6";
      }

      return res;
    });

    renderer.setSetting("edgeReducer", (edge, data) => {
      const res: Partial<EdgeDisplayData> = { ...data };

      if (state.hoveredNode && !graph.hasExtremity(edge, state.hoveredNode)) {
        res.hidden = true;
      }

      return res;
    });

    const input_button = document.getElementById("inputbutton")
    const input_text = document.getElementById("inputtext")

    function sent_text() {

      const text = (input_text as any).value
      console.log(text);

      axios.post('http://94.74.84.89:10600/task5/', {
        payload: text
      })
        .then(function (response) {
          graph.clear()

          const subjects: string[] = response.data.From;
          const verbs: string[] = response.data.Verb;
          const objects: string[] = response.data.To;

          for (let i = 0; i <= subjects.length - 1; i++) {
            const subject = subjects[i]
            const verb = verbs[i]
            const object = objects[i]

            graph.mergeNode(subject, { label: subject, color: "#674ea7" });
            graph.mergeNode(object, { label: object, color: "#ff3c2a" });
            graph.mergeEdge(subject, object, { weight: 1, label: verb, type: "arrow", size: 1, color: "#5b5b5b" });
          }

          let degrees = graph.nodes().map((node) => graph.degree(node));
          let minDegree = Math.min(...degrees);
          let maxDegree = Math.max(...degrees);
          let new_minSize = 2.75,
            new_maxSize = 20;
          renderer.setSetting("labelSize", 14);
          renderer.setSetting("edgeLabelSize", 14);
          
          if (graph.order<=6){
              new_maxSize = 25;
              new_minSize = 12;
              renderer.setSetting("labelSize", 20);
              renderer.setSetting("edgeLabelSize", 20);
            }else if(graph.order<=20){
              new_maxSize = 25-(graph.order-6)/14*5;
              new_minSize = 12-(graph.order-6)/14*9.25;
              renderer.setSetting("labelSize", 20-(graph.order-6)/14*6);
              renderer.setSetting("edgeLabelSize", 20-(graph.order-6)/14*6);
            }else{
            }
            
          graph.forEachNode((node) => {
            const degree = graph.degree(node);
            if (maxDegree - minDegree===0){
              if (graph.order<=10){
                graph.setNodeAttribute(
                  node,
                  "size",
                  new_maxSize-(graph.order-2)/8*(new_maxSize-new_minSize),
                  );
              }else{
                graph.setNodeAttribute(
                  node,
                  "size",
                  new_minSize,
                );
              }
            }else{
              graph.setNodeAttribute(
                node,
                "size",
                new_minSize + ((degree - minDegree) / (maxDegree - minDegree)) * (new_maxSize - new_minSize),
              );
            }
          });

          circular.assign(graph);
          const settings = forceAtlas2.inferSettings(graph);
          forceAtlas2.assign(graph, { settings, iterations: 600 });

          console.log(response);
        })
        .catch(function (error) {
          console.log(error);
        });
    }

    function check_keydown(event: any){
      if (event.key==='Enter'){
        sent_text();
      }
    }

    input_button?.addEventListener("click", sent_text);
    input_text?.addEventListener("keydown", check_keydown);

  })
  .catch(function (error) {
    console.log(error);
  });
