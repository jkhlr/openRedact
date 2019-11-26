from flask import Flask, request

app = Flask(__name__)


@app.route('/redact/', methods=['POST'])
def redact():
    if request.json is None:
        return "Missing JSON body with key 'text'"
    if request.json.get('text') is None:
        return {'error': "Missing key in JSON body: 'text'"}

    words = request.json['text'].split(' ')
    h0, h1 = classify(words)
    return {'text': words, 'H0': h0, 'H1': h1}


def classify(words):
    # TODO: replace dummy code with actual classification logic
    h0 = [int(bool(i % 2)) for i in range(len(words))]
    h1 = [int(not bool(i % 2)) for i in range(len(words))]
    return h0, h1


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0:8000')
