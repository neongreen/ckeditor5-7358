import Plugin from '@ckeditor/ckeditor5-core/src/plugin'
import { toWidget } from '@ckeditor/ckeditor5-widget/src/utils'
import Widget from '@ckeditor/ckeditor5-widget/src/widget'
import Command from '@ckeditor/ckeditor5-core/src/command'
// import View from '@ckeditor/ckeditor5-ui/src/view'
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview'
import React from 'react'
import ReactDOM from 'react-dom'
// import { Provider } from 'overmind-react'
// import store from '../../store'
import { IoIosDocument } from 'react-icons/io'

const pageLinkEditingRenderer = ({ id, name, mountEl }) => {
  ReactDOM.render(
    // <Provider value={store}>
    [
      <IoIosDocument
        className='inline-block mr-1'
        color='#989898'
        style={{
          verticalAlign: 'text-top'
        }}
      />,
      <span>{name}</span>
    ]
    // </Provider>
    ,
    mountEl
  )
}

class PageLinkUI extends Plugin {
  init () {
    const { editor } = this
    editor.ui.componentFactory.add('pageLink', locale => {
      const view = new ButtonView( locale );
      view.set( {
                label: 'Page link',
                tooltip: true
      } );
      view.on( 'execute', () => {
          editor.execute('insertPageLink', { id: "sample-id", name: "Sample page" })
      })
      return view
    })

  }
}


class InsertPageLinkCommand extends Command {
  execute ({ id, name }) {
    this.editor.model.change(writer => {
      this.editor.model.insertContent(writer.createElement('pageLink', { id, name }))
    })
  }

  refresh () {
    const model = this.editor.model
    const selection = model.document.selection
    const allowedIn = model.schema.findAllowedParent(selection.getFirstPosition(), 'pageLink')

    // TODO bind is enabled to react
    this.isEnabled = allowedIn !== null
  }
}

class PageLinkEditing extends Plugin {
  static get requires () {
    return [Widget]
  }

  init () {
    this._defineSchema()
    this._defineConverters()

    this.editor.commands.add('insertPageLink', new InsertPageLinkCommand(this.editor))
  }

  _defineSchema () {
    const schema = this.editor.model.schema

    schema.register('pageLink', {
      allowWhere: '$text',
      // The page link will act as an inline node:
      isInline: true,
      // Behaves like a self-contained object (e.g. an image).
      isObject: true,
      // Each page link has an ID and the content of the link (the page
      // title at the moment of link creation)
      allowAttributes: ['id', 'name']
    })
  }

  _defineConverters () {
    const editor = this.editor
    const conversion = editor.conversion

    // <productPreview> converters ((data) view → model)
    conversion.for('upcast').elementToElement({
      view: {
        name: 'a',
        classes: 'page-link'
      },
      model: (viewElement, modelWriter) => {
        // Read the "data-id" attribute from the view and set it as the "id" in the model.
        return modelWriter.writer.createElement('pageLink', {
          id: viewElement.getAttribute('href').split('/').pop(),
          name: viewElement.getChild(0).data
        })
      }
    })

    // <productPreview> converters (model → data view)
    conversion.for('dataDowncast').elementToElement({
      model: 'pageLink',
      view: (modelElement, { writer: viewWriter }) => {
        // In the data view, the model <productPreview> corresponds to:
        //
        // <section class="product" data-id="..."></section>
        const id = modelElement.getAttribute('id')
        const name = modelElement.getAttribute('name')
        const anchorElement = viewWriter.createContainerElement('a', {
          class: 'page-link',
          'href': `https://brick.do/${id}`
        })
        const innerText = viewWriter.createText(name)
        viewWriter.insert(viewWriter.createPositionAt(anchorElement, 0), innerText)

        return anchorElement
      }
    })

    // <productPreview> converters (model → editing view)
    conversion.for('editingDowncast').elementToElement({
      model: 'pageLink',
      view: (modelElement, { writer: viewWriter }) => {
        const id = modelElement.getAttribute('id')
        const name = modelElement.getAttribute('name')

        const span = viewWriter.createContainerElement('span', {
          class: 'page-link',
          'data-id': id
        })

        const reactWrapper = viewWriter.createRawElement('span', {
          class: 'page-link__react-wrapper'
        }, function (domElement) {
          pageLinkEditingRenderer({ id, name, mountEl: domElement })
        })

        viewWriter.insert(viewWriter.createPositionAt(span, 0), reactWrapper)

        return toWidget(span, viewWriter)
      }
    })
  }
}

export default class PageLink extends Plugin {
  static get requires () {
    return [PageLinkEditing, PageLinkUI]
  }
}
