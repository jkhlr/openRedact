var DocumentListView = Backbone.Marionette.CollectionView.extend({
  tagName: 'ul',
  childView: Backbone.Marionette.ItemView.extend({
    tagName: 'li',
    template: _.template('<a onClick="showDocument(\'<%-id%>\')"><%-title%></a>'),
  })
});

var AnnotationListView = Backbone.Marionette.CollectionView.extend({
  tagName: 'ul',
  childView: Backbone.Marionette.ItemView.extend({
    tagName: 'li',
    template: _.template('<a onClick="showAnnotation(\'<%-id%>\')"><%-title%></a>'),
  })
});

var List = Backbone.Collection.extend({
  model: Backbone.Model.extend({}),
  url: function() { return false; }
});

function init() {
  YPet.AnnotationTypes = new AnnotationTypeList([{name: 'PII', color: 'black'}]);
  YPet.addRegions({'p': '#target'});
  $.when(loadDocumentList(), loadAnnotationList()).done(function() {
    if (documents) {
      var documentId = documents[0].id;
      showDocument(documentId);
    }
  })
}

function loadDocumentList() {
  return getDocuments().done(function(data) {
    documents = _.map(data, function(d) {
      var title = d.text;
      if (title.length > 30) {
        title = title.substring(0,27) + '...';
      }
      return {title: title, id: d._id, text: d.text}
    });
    showDocumentList();
  })
}

function showDocumentList() {
  (new DocumentListView({
    collection: new List(documents),
    el: '#document-list'
  })).render();
}

function showDocument(documentId) {
  var doc = _.find(documents, function(d) {
    return d.id == documentId
  })
  currentDocumentId = documentId;
  currentAnnoationId = null
  $('p.paragraph').text(doc.text);
  paragraph = new Paragraph({'text': doc.text});
  YPet['p'].show(new WordCollectionView({collection: paragraph.get('words')}));
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
      title: 'Annotation ' + i,
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
    'https://box.jakobkoehler.de/box_3c8609f018476a8a41d6/documents/', 
    'GET'
  );
}

function getAnnotations() {
  return request(
    'https://box.jakobkoehler.de/box_3c8609f018476a8a41d6/annotations/',
    'GET'
  );
}

var documents = [];
var annotations = [];
var paragraph;

var currentDocument = null;
var currentAnnotation = null;
var annotationList = null;

(function login() {
  password = prompt("Password:");
  if (password) {
    request(
      'https://box.jakobkoehler.de/box_3c8609f018476a8a41d6/annotations/',
      'HEAD'
    ).done(init).fail(login);
  } else {
    login();
  }
})()



