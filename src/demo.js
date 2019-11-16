var DocumentListView = Backbone.Marionette.CollectionView.extend({
  tagName: 'ul',
  childView: Backbone.Marionette.ItemView.extend({
    tagName: 'li',
    template: _.template('<a <% if (id === currentDocumentId) { %>class="active-link" <% } %>onClick="showDocument(<% if (id) { %>\'<%-id%>\'<% } else { %>null<% } %>)"><%-title%></a>'),
  })
});

var AnnotationListView = Backbone.Marionette.CollectionView.extend({
  tagName: 'ul',
  childView: Backbone.Marionette.ItemView.extend({
    tagName: 'li',
    template: _.template('<span><a <% if (id === currentAnnotationId) { %>class="active-link" <% } %>onClick="showAnnotation(<% if (id) { %>\'<%-id%>\'<% } else { %>null<% } %>)"><%-title%></a><% if (id) { %>&nbsp;[<a onClick="removeAnnotation(\'<%-id%>\')">X</a>]<% } %></span>'),
  })
});

var PageNumberView = Backbone.View.extend({
  render: function(){
      var template =  _.template('<% if (currentPageNumber !== 0) { %><a onClick="showPage(currentPageNumber - 1)"><</a><% } else { %><<% } %>&nbsp;<%-currentPageNumber + 1%>/<%-numPages%>&nbsp;<% if (currentPageNumber < numPages - 1) { %><a onClick="showPage(currentPageNumber + 1)">></a><% } else { %>><% } %>')
      this.$el.html( template );
    }

});

var List = Backbone.Collection.extend({
  model: Backbone.Model.extend({}),
  url: function() { return false; }
});

function init() {
  YPet.AnnotationTypes = new AnnotationTypeList([{name: 'PII', color: 'grey'}]);
  YPet.addRegions({'p': '#target'});
  $.when(loadDocumentList(), loadAnnotationList()).done(function() {
    showDocumentList();
  })
}

function showPage(pageNumber) {
  currentPageNumber = pageNumber;
  pageNumberView.render();
  showDocumentList();
}

function loadDocumentList() {
  return getDocuments().done(function(data) {
    documents = data;
    numPages = Math.ceil(data.length/pageSize);
    pageNumberView = new PageNumberView({
      tagName: 'span',
      el: '#page-number'
    });
    pageNumberView.render();
  })
}

function showDocumentList() {
  var startItem = currentPageNumber * pageSize;
  var page = documents.slice(startItem, startItem + pageSize);
  var shownDocuments = _.map(page, function(d) {
    var title = d.text;
    if (title.length > 30) {
      title = title.substring(0,27) + '...';
    }
    return {title: title, id: d._id, text: d.text}
  });
  if (!documentList) {
    documentList = new DocumentListView({
      collection: new List(shownDocuments),
      el: '#document-list'
    });
  } else {
    documentList.collection = new List(shownDocuments)
  }
  documentList.render();
  if (shownDocuments.length) {
    showDocument(shownDocuments[0].id);
  }
}

function showDocument(documentId) {
  var doc = _.find(documents, function(d) {
    return d._id == documentId
  })
  currentDocumentId = documentId;
  currentAnnotationId = null
  $('p.paragraph').text(doc.text);
  paragraph = new Paragraph({'text': doc.text});
  YPet['p'].show(new WordCollectionView({collection: paragraph.get('words')}));
  documentList.render();
  showAnnotationList(documentId);
  firstAnnotation = _.find(annotations, function(a) {
    return a.documentId == documentId;
  })
  showAnnotation(firstAnnotation ? firstAnnotation._id : null);
}

function loadAnnotationList() {
  return getAnnotations().done(function(data) {
    annotations = data;
  });
}

function showAnnotationList(documentId) {
  var i = 0;
  var currentAnnotations = _.map(_.filter(annotations, function(a) {
    return a.documentId == currentDocumentId;
  }), function(a) {
    i += 1;
    return {
      documentId: a.documentId,
      id: a._id,
      title: 'H ' + (i - 1),
      annotations: a.annotations
    }
  });
  currentAnnotations.push({
    id: null,
    title: 'New Annotation',
    annotations: []
  });
  if (!annotationList) {
    annotationList = new AnnotationListView({
      collection: new List(currentAnnotations),
      el: '#annotation-list'
    });
  } else {
    annotationList.collection = new List(currentAnnotations)
  }
  annotationList.render();
}

function showAnnotation(annotationId) {
  currentAnnotationId = annotationId;
  var annotation = _.find(annotations, function(a) {
    return a._id == annotationId
  })
  paragraph.setAnnotationJSON(annotation ? annotation.annotations: []);
  annotationList.render();
}

function removeAnnotation(annotationId) {
  deleteAnnotation(annotationId).done(function() {
    annotations = _.filter(annotations, function(a) {
        return a._id != annotationId
    });
    showAnnotationList(currentDocumentId);
    if (currentAnnotationId == annotationId) {
      firstAnnotation = _.find(annotations, function(a) {
        return a.documentId == currentDocumentId;
      });
      currentAnnotationId = firstAnnotation ? firstAnnotation._id : null;
      showAnnotation(currentAnnotationId);
    }
  });
}

function saveAnnotation() {
  $('#save-btn').prop('disabled', true);
  var url, method;
  var annotationJSON = paragraph.getAnnotationJSON();
  if (!annotationJSON) {
    return
  }
  if (currentAnnotationId) {
    _.find(annotations, function(a) {
      return a._id == currentAnnotationId
    }).annotations = annotationJSON;

    url = 'https://box.jakobkoehler.de/box_3c8609f018476a8a41d6/annotations/'+currentAnnotationId;
    method = 'PUT';
    
  } else {
    url = 'https://box.jakobkoehler.de/box_3c8609f018476a8a41d6/annotations/';
    method = 'POST';
  }
  request(url, method, {'documentId': currentDocumentId, 'annotations': annotationJSON}).done(function(data) {
    if (!currentAnnotationId) {
      currentAnnotationId = data._id;
      annotations.push(data);
    }
    showAnnotationList(currentDocumentId);
    $('#save-btn').prop('disabled', false);
  });
}

function request(url, type, data) {
  var username = 'jsonbox';
  if (data) {
    data = JSON.stringify(data);
  }
  return $.ajax({
    url: url,
    type: type,
    data: data,
    dataType: 'json',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Basic ' + btoa(username + ':' + password)
    }
  });
}

function getDocument(id) {
  return request(
    'https://box.jakobkoehler.de/box_3c8609f018476a8a41d6/'+id, 
    'GET'
  );
}

function getDocuments() {
  return request(
    'https://box.jakobkoehler.de/box_3c8609f018476a8a41d6/documents/?sort=_createdOn&limit=0', 
    'GET'
  );
}

function getAnnotations() {
  return request(
    'https://box.jakobkoehler.de/box_3c8609f018476a8a41d6/annotations/?sort=_createdOn&limit=0',
    'GET'
  );
}

function deleteAnnotation(id) {
  return request(
    'https://box.jakobkoehler.de/box_3c8609f018476a8a41d6/annotations/'+id,
    'DELETE'
  );
}

var documents = [];
var annotations = [];
var paragraph;

var currentDocumentId = null;
var currentAnnotationId = null;
var currentPageNumber = 0;

var documentList = null;
var annotationList = null;
var pageNumberView = null;

var numPages = null;
var pageSize = 10;

var password;


(function login() {
  password = window.localStorage.getItem('annotatorPassword');
  if(!password) {
    password = prompt("Password:");
  }
  if (password) {
    request(
      'https://box.jakobkoehler.de/box_3c8609f018476a8a41d6/annotations/',
      'HEAD'
    ).done(function() {
      window.localStorage.setItem('annotatorPassword', password);
      init();
    }).fail(function() {
      window.localStorage.removeItem('annotatorPassword');
      login();
    });
  } else {
    login();
  }
})()



