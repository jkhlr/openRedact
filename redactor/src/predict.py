import joblib
import spacy

from . import MODEL_DIR, get_label_vectors


def predict_redaction_labels(words, model_name):
    label_vectors = get_label_vectors_for_model(words, model_name)
    classifier = joblib.load(f'{MODEL_DIR}/{model_name}/randomforestmodel.pkl')
    predictions = [int(classifier.predict([vector])) for vector in label_vectors]
    classes = [(int(cls == 0), int(cls == 1)) for cls in predictions]
    h0, h1 = zip(*classes)
    h1 = [int(h0[i] or h1[i]) for i in range(len(h1))]
    return h0, h1


def get_label_vectors_for_model(words, spacy_model_name):
    trained_model = spacy.load(f'{MODEL_DIR}/{spacy_model_name}/spacy')
    return get_label_vectors(words, trained_model)
