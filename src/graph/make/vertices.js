/**
 * Rabbit Ear (c) Kraft
 */
import {
	TWO_PI,
} from "../../math/constant.js";
import {
	flip,
} from "../../math/vector.js";
import {
	counterClockwiseSectors2,
} from "../../math/radial.js";
import {
	makeEdgesVector,
} from "./edges.js";
import {
	makeVerticesVertices,
} from "./verticesVertices.js";
import {
	makeVerticesToEdge,
} from "./lookup.js";

/**
 * @description For every vertex, make an array of vectors that point towards each
 * of the incident vertices. This is accomplised by taking the vertices_vertices
 * array and converting it into vectors, indices will be aligned with vertices_vertices.
 * @param {FOLD} graph a FOLD object, containing vertices_coords, vertices_vertices, edges_vertices
 * @returns {number[][][]} array of array of array of numbers, where each row corresponds
 * to a vertex index, inner arrays correspond to vertices_vertices, and inside is a 2D vector
 * @todo this can someday be rewritten without edges_vertices
 * @linkcode Origami ./src/graph/make.js 395
 */
export const makeVerticesVerticesVector = ({
	vertices_coords, vertices_vertices, vertices_edges, vertices_faces,
	edges_vertices, edges_vector, faces_vertices,
}) => {
	if (!edges_vector) {
		edges_vector = makeEdgesVector({ vertices_coords, edges_vertices });
	}
	if (!vertices_vertices) {
		vertices_vertices = makeVerticesVertices({
			vertices_coords, vertices_edges, vertices_faces, edges_vertices, faces_vertices,
		});
	}
	const edge_map = makeVerticesToEdge({ edges_vertices });
	return vertices_vertices
		.map((_, a) => vertices_vertices[a]
			.map((b) => {
				const edge_a = edge_map[`${a} ${b}`];
				const edge_b = edge_map[`${b} ${a}`];
				if (edge_a !== undefined) { return edges_vector[edge_a]; }
				if (edge_b !== undefined) { return flip(edges_vector[edge_b]); }
			}));
};

/**
 * @description Between pairs of counter-clockwise adjacent edges around a vertex
 * is the sector measured in radians. This builds an array of of sector angles,
 * index matched to vertices_vertices.
 * @param {FOLD} graph a FOLD object, containing vertices_coords, vertices_vertices, edges_vertices
 * @returns {number[][]} array of array of numbers, where each row corresponds
 * to a vertex index, inner arrays contains angles in radians
 * @linkcode Origami ./src/graph/make.js 420
 */
export const makeVerticesSectors = ({
	vertices_coords, vertices_vertices, edges_vertices, edges_vector,
}) => makeVerticesVerticesVector({
	vertices_coords, vertices_vertices, edges_vertices, edges_vector,
}).map(vectors => (vectors.length === 1 // leaf node
	? [TWO_PI] // interior_angles gives 0 for leaf nodes. we want 2pi
	: counterClockwiseSectors2(vectors)));
