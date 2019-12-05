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
    render: function () {
        var template = _.template('<% if (currentPageNumber !== 0) { %><a onClick="showPage(currentPageNumber - 1)"><</a><% } else { %><<% } %>&nbsp;<%-currentPageNumber + 1%>/<%-numPages%>&nbsp;<% if (currentPageNumber < numPages - 1) { %><a onClick="showPage(currentPageNumber + 1)">></a><% } else { %>><% } %>')
        this.$el.html(template);
    }
});

var RunModeView = Backbone.View.extend({
    render: function () {
        var template = _.template('<span><% if (runMode === "REDACT") { %><b>Redact</b> | <a onClick="setRunMode(\'ANNOTATE\')">Annotate</a><% } else { %><a onClick="setRunMode(\'REDACT\')">Redact</a> | <b>Annotate</b><% } %>');
        this.$el.html(template);
    }
});

var RedactionLevelView = Backbone.View.extend({
    render: function () {
        var template = _.template('<span><% if (currentRedactionLevel === "H0") { %><b>H0</b> | <a onClick="showRedactionLevel(\'H1\')">H1</a><% } else { %><a onClick="showRedactionLevel(\'H0\')">H0</a> | <b>H1</b><% } %>');
        this.$el.html(template);
    }
});

var RedactionModelView = Backbone.Marionette.CollectionView.extend({
    tagName: 'ul',
    childView: Backbone.Marionette.ItemView.extend({
        tagName: 'li',
        template: _.template('<span><a <% if (modelName === currentRedactionModel) { %>class="active-link" <% } %>onClick="setRedactionModel(\'<%-modelName%>\')"><%-modelName%></a>&nbsp;Status: <%-status%></span>'),
    })
});

var List = Backbone.Collection.extend({
    model: Backbone.Model.extend({}),
    url: function () {
        return false;
    }
});

function init() {
    YPet.AnnotationTypes = new AnnotationTypeList([{name: 'PII', color: 'grey'}]);
    YPet.addRegions({'p': '#target'});
    runModeView = new RunModeView({
        tagName: 'span',
        el: '#run-mode'
    });
    runModeView.render();
    redactionLevelView = new RedactionLevelView({
        tagName: 'span',
        el: '#redaction-level'
    });
    $.when(loadDocumentList(), loadAnnotationList(), loadRedactionModels()).done(function () {
        setRunMode('REDACT');
    });
}

function setRunMode(mode) {
    runMode = mode;
    if (runMode === 'REDACT') {
        showText('Click [Redact Text] to redact input text...');
        $('.ui-annotate').hide();
        $('.ui-redact').show();
        $('.redaction-level-container').hide();
    } else if (runMode === 'ANNOTATE') {
        showDocumentList();
        $('.ui-redact').hide();
        $('.ui-annotate').show();
    }
    runModeView.render()
}

function showPage(pageNumber) {
    currentPageNumber = pageNumber;
    pageNumberView.render();
    showDocumentList();
}

function setRedactionModel(modelName) {
    currentRedactionModel = modelName;
    redactionModelView.render();
}

function loadRedactionModels() {
    return getRedactionModels().done(function (data) {
        if (!redactionModelView) {
            redactionModelView = new RedactionModelView({
                collection: new List(data.models),
                el: '#redaction-models'
            });
        } else {
            redactionModelView.collection = new List(data.models);
        }
        redactionModelView.render();
    });
}

function loadDocumentList() {
    return getDocuments().done(function (data) {
        documents = data;
        numPages = Math.ceil(data.length / pageSize);
        pageNumberView = new PageNumberView({
            tagName: 'span',
            el: '#page-number'
        });
        pageNumberView.render();
    })
}

function showDocumentList(showFirst) {
    var startItem = currentPageNumber * pageSize;
    var page = documents.slice(startItem, startItem + pageSize);
    var shownDocuments = _.map(page, function (d) {
        var title = d.text;
        if (title.length > 30) {
            title = title.substring(0, 27) + '...';
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
    if (shownDocuments.length && showFirst) {
        showDocument(shownDocuments[0].id);
    }
}

function showDocument(documentId) {
    var doc = _.find(documents, function (d) {
        return d._id === documentId
    });
    currentDocumentId = documentId;
    currentAnnotationId = null;
    showText(doc.text);
    documentList.render();
    showAnnotationList(documentId);
    firstAnnotation = _.find(annotations, function (a) {
        return a.documentId === documentId;
    });
    showAnnotation(firstAnnotation ? firstAnnotation._id : null);
}

function loadAnnotationList() {
    return getAnnotations().done(function (data) {
        annotations = data;
    });
}

function showAnnotationList(documentId) {
    var i = 0;
    var currentAnnotations = _.map(_.filter(annotations, function (a) {
        return a.documentId === currentDocumentId;
    }), function (a) {
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
    var annotation = _.find(annotations, function (a) {
        return a._id === annotationId
    });
    paragraph.setAnnotationJSON(annotation ? annotation.annotations : []);
    annotationList.render();
}

function removeAnnotation(annotationId) {
    deleteAnnotation(annotationId).done(function () {
        annotations = _.filter(annotations, function (a) {
            return a._id !== annotationId
        });
        showAnnotationList(currentDocumentId);
        if (currentAnnotationId === annotationId) {
            firstAnnotation = _.find(annotations, function (a) {
                return a.documentId === currentDocumentId;
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
        _.find(annotations, function (a) {
            return a._id === currentAnnotationId
        }).annotations = annotationJSON;

        url = 'jsonbox/annotations/' + currentAnnotationId;
        method = 'PUT';

    } else {
        url = 'jsonbox/annotations/';
        method = 'POST';
    }
    request(url, method, {'documentId': currentDocumentId, 'annotations': annotationJSON}).done(function (data) {
        if (!currentAnnotationId) {
            currentAnnotationId = data._id;
            annotations.push(data);
        }
        showAnnotationList(currentDocumentId);
        $('#save-btn').prop('disabled', false);
    });
}

function showText(text) {
    $('p.paragraph').text(text);
    paragraph = new Paragraph({'text': text});
    YPet['p'].show(new WordCollectionView({collection: paragraph.get('words')}));
}

function redactText() {
    $('.redaction-level-container').hide();
    var text = $('#redact-textarea').val();
    getRedaction(text).done(function (data) {
        showText(text);

        var words = data.text;
        var starts = [0];

        words.map(function (word) {
            return word.length
        }).reduce(function (a, b, i) {
            return starts[i + 1] = a + b + 1;
        }, 0);
        starts = starts.slice(0, starts.length - 1);

        var annotations = words.map(function (word, i) {
            return {
                'start': starts[i],
                'text': word
            }
        });
        redactions = {
            H0: annotations.filter(function (annotation, i) {
                return data.H0[i] === 1;
            }),
            H1: annotations.filter(function (annotation, i) {
                return data.H1[i] === 1;
            })
        };
        showRedactionLevel('H0');
        $('.redaction-level-container').show();
    })
}

function trainModel() {
    var modelName = $('#model-name').val();
    triggerModelTraining(modelName, 1).done(function () {
        $('#model-name').val('');
        pollModelStatus();
    })
}

function pollModelStatus() {
    loadRedactionModels().done(function(data) {
        var statuses = data.models.map(function (model) {
            return model.status;
        });
        if (statuses.filter(function (status) {return status === 'training'}).length) {
           setTimeout(pollModelStatus, 2000)
        }
    })
}

function uploadDocument() {
    var text = $('#document-upload').val();
    if (!text)
        return;

    postDocuments(text).done(function(data) {
        $('#document-upload').val('');
        documents.push(data);

        numPages = Math.ceil(documents.length / pageSize);
        pageNumberView.render();

        showDocumentList(false);
        showPage(numPages - 1);
        showDocument(data._id);
    })

}
function showRedactionLevel(level) {
    currentRedactionLevel = level;
    var annotation = redactions[level];
    paragraph.setAnnotationJSON(annotation);
    redactionLevelView.render();
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

function getDocuments() {
    return request(
        'jsonbox/documents/?sort=_createdOn&limit=0',
        'GET'
    );
}

function postDocuments(text) {
    return request(
        'jsonbox/documents/',
        'POST',
        {text: text}
    );
}


function getAnnotations() {
    return request(
        'jsonbox/annotations/?sort=_createdOn&limit=0',
        'GET'
    );
}

function deleteAnnotation(id) {
    return request(
        'jsonbox/annotations/' + id,
        'DELETE'
    );
}

function getRedaction(text) {
    return $.ajax({
        url: 'redactor/redact/',
        type: 'POST',
        data: JSON.stringify({text: text, modelName: currentRedactionModel}),
        dataType: 'json',
        contentType: 'application/json',
    });
}

function getRedactionModels() {
    return $.ajax({
        url: 'redactor/train/',
        type: 'GET',
        dataType: 'json',
        contentType: 'application/json',
    });
}

function triggerModelTraining(modelName, iterations) {
    return $.ajax({
        url: 'redactor/train/',
        type: 'POST',
        data: JSON.stringify({modelName: modelName, iterations: iterations}),
        dataType: 'json',
        contentType: 'application/json',
    });
}


var documents = [];
var annotations = [];
var redactions = {};
var paragraph;

var runMode = null;
var currentDocumentId = null;
var currentAnnotationId = null;
var currentPageNumber = 0;
var currentRedactionLevel = null;
var currentRedactionModel = 'pretrained';


var documentList = null;
var annotationList = null;
var pageNumberView = null;
var runModeView = null;
var redactionModelView = null;

var numPages = null;
var pageSize = 17;

var password;


(function login() {
    password = window.localStorage.getItem('annotatorPassword');
    if (!password) {
        password = prompt("Password:");
    }
    if (password) {
        request(
            'jsonbox/annotations/',
            'HEAD'
        ).done(function () {
            window.localStorage.setItem('annotatorPassword', password);
            init();
        }).fail(function () {
            window.localStorage.removeItem('annotatorPassword');
            login();
        });
    } else {
        login();
    }
})();



