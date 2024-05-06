/**
 * Rabbit Ear (c) Kraft
 */
import {
	EPSILON,
} from "../../math/constant.js";
import {
	includeS,
	epsilonEqual,
} from "../../math/compare.js";
import {
	scale2,
	add2,
	resize2,
} from "../../math/vector.js";
import {
	intersectLineLine,
} from "../../math/intersect.js";
import {
	clusterSortedGeneric,
} from "../../general/cluster.js";
import {
	sweepValues,
} from "../sweep.js";
import {
	removeDuplicateVertices,
} from "../vertices/duplicate.js";
import {
	circularEdges,
	removeCircularEdges,
} from "../edges/circular.js";
import {
	invertArrayToFlatMap,
	mergeFlatNextmaps,
	mergeNextmaps,
} from "../maps.js";
import {
	edgeToLine2,
	edgesToLines2,
} from "../edges/lines.js";
import {
	makeVerticesEdgesUnsorted,
} from "../make/verticesEdges.js";

/**
 * @param {FOLD} graph a FOLD object
 * @todo line sweep
 */
export const intersectAllEdges = ({
	vertices_coords,
	vertices_edges,
	edges_vertices,
}, epsilon = EPSILON) => {
	const edgesEdgesLookup = edges_vertices.map(() => ({}));
	edges_vertices.forEach((vertices, e) => vertices
		.flatMap(v => vertices_edges[v])
		.forEach(edge => {
			edgesEdgesLookup[e][edge] = true;
			edgesEdgesLookup[edge][e] = true;
		}));
	const lines = edgesToLines2({ vertices_coords, edges_vertices });
	const results = [];
	// todo: line sweep
	for (let i = 0; i < edges_vertices.length - 1; i += 1) {
		for (let j = i + 1; j < edges_vertices.length; j += 1) {
			if (edgesEdgesLookup[i][j]) { continue; }
			const { a, b, point } = intersectLineLine(
				lines[i],
				lines[j],
				includeS,
				includeS,
				epsilon,
			);
			if (point) {
				if ((epsilonEqual(a, 0) || epsilonEqual(a, 1))
					&& (epsilonEqual(b, 0) || epsilonEqual(b, 1))) {
					continue;
				}
				results.push({ i, j, a, b, point });
			}
		}
	}
	return results;
};

/**
 * @param {FOLD} graph a FOLD object
 * @param {number} [epsilon=1e-6] an optional epsilon
 * @returns {{ graph: FOLD, changes: object }}
 */
export const planarizeOverlaps = (
	{ vertices_coords, vertices_edges, edges_vertices, edges_assignment, edges_foldAngle },
	epsilon = EPSILON,
) => {
	if (!vertices_edges) {
		vertices_edges = makeVerticesEdgesUnsorted({ edges_vertices });
	}

	const edgesParams = edges_vertices.map(() => []);

	const intersections = intersectAllEdges({
		vertices_coords, vertices_edges, edges_vertices,
	}, epsilon);

	intersections
		.filter(({ a }) => !epsilonEqual(a, 0) && !epsilonEqual(a, 1))
		.forEach(({ i, a }) => edgesParams[i].push(a));
	intersections
		.filter(({ b }) => !epsilonEqual(b, 0) && !epsilonEqual(b, 1))
		.forEach(({ j, b }) => edgesParams[j].push(b));

	edgesParams.forEach(points => points.sort((a, b) => a - b));

	const edgesPointClusters = edgesParams
		.map(points => clusterSortedGeneric(points, epsilonEqual))

	/** @param {number[]} numbers */
	const average = (numbers) => (numbers.length
		? numbers.reduce((a, b) => a + b, 0) / numbers.length
		: 0);

	const edgesSplitParams = edgesPointClusters
		.map((clusters, e) => clusters
			.map(cluster => cluster.map(i => edgesParams[e][i]))
			.map(average));

	let newEdgeIndex = 0;
	const edgeNextmapPlanarized = edgesSplitParams
		.map(params => Array.from(Array(params.length + 1)).map(() => newEdgeIndex++));
	const edgeBackmapPlanarized = invertArrayToFlatMap(edgeNextmapPlanarized);

	// this new edges_vertices array will entirely replace the old one.
	let newVertexIndex = vertices_coords.length;
	/** @type {[number, number][]} */
	const edges_verticesNew = edgesSplitParams
		.map(params => params.map(() => newVertexIndex++))
		.map((verts, e) => [
			edges_vertices[e][0],
			...verts,
			edges_vertices[e][1],
		])
		.flatMap(vertices => Array.from(Array(vertices.length - 1))
			.map((_, i) => [vertices[i], vertices[i + 1]]))
		.map(([a, b]) => [a, b]);

	// this vertices_coords array is meant to be appended to the existing
	// vertices_coords array, this only contains the new vertices.
	const additionalVertices_coords = edgesSplitParams.flatMap((params, edge) => {
		if (!params.length) { return []; }
		const line = edgeToLine2({ vertices_coords, edges_vertices }, edge);
		return params.map(t => add2(line.origin, scale2(line.vector, t)));
	});

	const vertices_coordsNew = vertices_coords
		.concat(additionalVertices_coords)
		.map(resize2);

	const graph = {
		vertices_coords: vertices_coordsNew,
		edges_vertices: edges_verticesNew,
	};

	if (edges_assignment) {
		graph.edges_assignment = edgeBackmapPlanarized
			.map(e => edges_assignment[e]);
	}
	if (edges_foldAngle) {
		graph.edges_foldAngle = edgeBackmapPlanarized
			.map(e => edges_foldAngle[e]);
	}

	// this does not include the new vertices, which should have a
	// value of "undefined" anyway as they did not exist prior.
	/** @type {number[]} */
	const startNextmap = vertices_coords.map((_, i) => i);

	const { map: verticesMapDuplicate } = removeDuplicateVertices(graph, epsilon);
	// circular edges will be created at points where for example many lines cross
	// at a point (but not exactly), creating little small edges with lengths
	// around an epsilon, and by calling remove duplicate vertices these edges'
	// two vertices become the same vertex, creating circular edges.
	const { map: edgeMapCircular } = removeCircularEdges(graph);

	const edgesMap = mergeNextmaps(edgeNextmapPlanarized, edgeMapCircular);
	const verticesMap = mergeFlatNextmaps(startNextmap, verticesMapDuplicate);

	return {
		graph,
		changes: {
			vertices: { map: verticesMap },
			edges: { map: edgesMap },
		}
	};
}
