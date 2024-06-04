class ConstructionNode {
    constructor({ element = null, parentNode = 0, y = 0 }) {
        this.element = element;
        this.parentNode = parentNode;
        this.y = y;
        this.x = 0;
        this.data = new Map();
        this.elements = [];
        this.labelNode = null;
        this.isLabelNode = false;
    }
    toJSON() {
        const json = {
            spp2cvmeta: {
                idp: this.element?.id || 'root',
            },
        };

        let provideChild = false;

        for (const [key, value] of this.data.entries()) {
            json[key] = value;
        }

        if (!json.y) {
            json.y = this.y;
        }

        if (!json.x) {
            json.x = this.x;
        }

        if (this.element.length > 0 && !json['children']) {
            provideChild = true;
            json['children'] = this.element.children.map((node) => node.render()).flat();
        }

        json.spp2cvmeta.provideChild = provideChild;

        return json;
    }

    render() {
        const renderedNodes = [this.toJSON()];
        if (this.labelNode) {
            const labelJSON = this.label.toJSON();
            renderedNodes.unshift(labelJSON);
        }
        return renderedNodes;
    }

    set(key, value) {
        if (value === undefined) {
            this.data.delete(key);
        } else {
            this.data.set(key, value);
        }
    }

    get(key) {
        return this.data.get(key);
    }

    growNode(element, y) {
        const growedNode = new ConstructionNode({
            element,
            parentNode: this,
        });

        this.elements.push(growedNode);
        return growedNode;
    }

    createLabelNode() {
        if (this.isLabelNode) {
            throw new Error('You cannot create a label for a label node');
        }
        if (this.labelNode) {
            throw new Error('Label node for this node already created');
        }

        const labelNode = new ConstructionNode({
            element: this.element,
            parentNode: this,
            y: this.y,
        });

        this.labelNode = labelNode;
        this.labelNode.isLabelNode = true;

        return labelNode;
    }
}

class ConverterV3ToV2 {
    constructor() {
        this.y = 0;
        this.rootNode = new ConstructionNode({
            y: this.y,
            element: null,
            parentNode: null,
        });
        this.currentNode = null;
        this.renderStack = [];
    }

    get element() {
        return this.currentNode.element;
    }

    get convertersVariable() {
        return {
            id: this.element.id,
            root: this.currentNode,
            attributes: this.element.attributes,
            components: this.element.components,
        };
    }

    convert(formV3) {
        const { form: elements } = formV3;
        console.log('elements', elements);
        this.renderStack.push({
            root: this.rootNode,
            elements,
        });

        while (this.renderStack.length > 0) {
            const { root, elements } = this.renderStack.pop();
            this.currentNode = root;

            for (const element of elements) {
                this.nodeSwitchAndConvertElement(element);
            }

            this.currentNode = null;

            const renderedElements = this.rootNode.render();
            const children = renderedElements[0]['children'];
            const formV2 = { form: children };

            console.log('formV3', formV3);
            console.log('formV2', formV2);

            return formV2;
        }
    }

    nodeSwitchAndConvertElement(element) {
        const previousNode = this.currentNode;
        this.currentNode = this.currentNode.growNode(element < ++this.y);

        const nextElements = this.convertElement();

        if (nextElements && Array.isArray(nextElements)) {
            this.renderStack.push({
                root: this.currentNode,
                elements: nextElements,
            });
        }

        this.currentNode = this.currentNode.parentNode;

        if (previousNode !== this.currentNode) {
            throw new Error('stack construction node error');
        }
    }

    convertElement() {
        switch (this.element.type) {
            case 'label':
                return this.convertLabel(this.convertersVariable);
            case 'column':
                return this.convertColumn(this.convertersVariable);
            case 'combobox':
                return this.convertCombobox(this.convertersVariable);
            case 'frame':
                return this.convertFrame(this.convertersVariable);
            case 'text':
                return this.convertText(this.convertersVariable);
            case 'table':
                return this.convertTable(this.convertersVariable);
            case 'multitext':
                return this.convertMultitext(this.convertersVariable);
            case 'htmlviewer':
                return this.convertHtmlview(this.convertersVariable);
            case 'attachment':
                return this.convertAttachment(this.convertersVariable);
            case 'button':
                return this.convertButton(this.convertersVariable);
            case 'radio':
                return this.convertRadio(this.convertersVariable);
            case 'checkbox':
                return this.convertCheckbox(this.convertersVariable);
            case 'datetime':
                return this.convertDatetime(this.convertersVariable);
            default:
                return this.defaultConversion();
        }
    }

    convertFrame({ root, attributes, components }) {
        this.templateFillType('group', 'bevelframe');
        this.templateFillRMV();
        root.set('x', null);
        root.set('y', null);
        return components;
    }

    convertText({ root, attributes }) {
        const label = this.templateCreateLabel();
        this.templateFillType('comfill');
        this.templateFillRMV();
        this.templateFillInput();
        // magic zero
        root.set('selectonly', 0);
    }

    convertTable({ root, attributes }) {
        const label = this.templateCreateLabel();
        this.templateFillType('table');
        this.templateFillRMV();
        return attributes['schema'];
    }

    convertColumn({ root, attributes }) {
        this.templateFillType('column');
        this.templateFillRMV();
        root.set('scWidthPercent', attributes['widthPercent']);
        root.set('readonly', attributes['readonly'] ?? false);
        root.set('mandatory', expressionToJs(attributes['mandatory'] ?? false));
        root.set('visible', expressionToJs(attributes['visible'] ?? true));
        return [attributes['subelement']];
    }

    convertLabel({ root, attributes }) {
        this.templateFillInput();
        this.templateFillType('label');
        this.templateFillRMV();
        root.set('value', attributes['caption'] || attributes['name'] || attributes['mark']);
    }

    convertMultitext({ root, attributes }) {
        const label = this.templateCreateLabel();
        this.templateFillType('textarea', 'multitext');
        this.templateFillRMV();
        this.templateFillInput();
    }

    convertHtmlview({ root, attributes }) {
        this.templateFillType('html', 'htmlviewer');
        this.templateFillRMV();
        root.set('HtmlGeneratingScript', attributes['htmlSid']);
        root.set('value', attributes['htmlContent']);
    }

    convertAttachment({ root, attributes }) {
        this.templateFillType('attachmentcontainer', 'olecontainer');
        this.templateFillRMV();
    }

    convertButton({ root, attributes }) {
        this.templateFillRMV();
        root.set('elementType', 'button');
        root.set('caption', attributes['caption']);
        root.set('dvdEnabled', attributes['dvdEnabled']);
        root.set('buttonID', attributes['buttonID']);
    }

    convertRadio({ root, attributes }) {
        this.templateFillType('input', 'radio');
        this.templateFillRMV();
        this.templateFillInput();
        root.set('checkedValue', attributes['value']);
        root.set('children', attributes['caption']);
    }

    convertCheckbox({ root, attributes }) {
        this.templateFillType('input', 'checkbox');
        this.templateFillRMV();
        this.templateFillInput();
    }

    convertDatetime({ root, attributes }) {
        const label = this.templateCreateLabel();
        this.templateFillType('input', 'datetime');
        this.templateFillRMV();
        this.templateFillInput();
    }

    templateCreateLabel() {
        const { root, attributes } = this.convertersVariable;
        const name = attributes['name'];
        const label = root.createLabelNode();
        label.set('type', 'label');
        label.set('elementType', 'label');
        label.set('value', attributes['name']);
        label.set('readonly', false);
        label.set('mandatory', expressionToJs(attributes['mandatory']));
        label.set('visible', expressionToJs(attributes['visible']));
        return label;
    }

    templateFillType(type, elementType) {
        const { root } = this.convertersVariable;
        root.set('type', type);
        root.set('elementType', elementType ?? type);
    }

    templateFillRMV() {
        const { root, attributes } = this.convertersVariable;
        root.set('readonly', expressionToJs(attributes['readonly']));
        root.set('mandatory', expressionToJs(attributes['mandatory']));
        root.set('visible', expressionToJs(attributes['visible']));
    }

    templateFillInput() {
        const { root, attributes } = this.convertersVariable;
        root.set('field', attributes['input']);
    }

    plug() {
        this.currentNode.set('type', 'plug');
        this.currentNode.set('elementType', 'plug');
        this.currentNode.set('elementv3', this.element);
    }
}

const convertV3ToV2 = (formV3) => {
    const converter = new ConverterV3ToV2();
    return converter.convert(formV3);
};
