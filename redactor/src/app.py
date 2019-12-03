from flask import Flask, request

from .predict import predict_redaction_labels

app = Flask(__name__)


@app.route('/redact/', methods=['POST'])
def redact():
    if request.json is None:
        return "Missing JSON body with key 'text'"
    if request.json.get('text') is None:
        return {'error': "Missing key in JSON body: 'text'"}

    words = request.json['text'].split(' ')
    h0, h1 = predict_redaction_labels(words)
    return {'text': words, 'H0': h0, 'H1': h1}


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0:8000')
