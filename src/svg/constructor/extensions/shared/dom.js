/* svg (c) Kraft, MIT License */
import { toKebab } from '../../../general/transformCase.js';

const removeChildren = (element) => {
	while (element.lastChild) {
		element.removeChild(element.lastChild);
	}
	return element;
};
const appendTo = (element, parent) => {
	if (parent && parent.appendChild) {
		parent.appendChild(element);
	}
	return element;
};
const setAttributes = (element, attrs) => {
	Object.keys(attrs)
		.forEach(key => element.setAttribute(toKebab(key), attrs[key]));
	return element;
};

export { appendTo, removeChildren, setAttributes };
