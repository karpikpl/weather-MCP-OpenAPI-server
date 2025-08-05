import azure.functions as func
import datetime
import json
import logging
import httpx

app = func.FunctionApp()


@app.queue_trigger(arg_name="msg", queue_name="azure-function-weather-input", connection="AzureWebJobsStorage")
@app.queue_output(arg_name="outputQueue", queue_name="azure-function-weather-output", connection="AzureWebJobsStorage")

async def check_weather(msg: func.QueueMessage, outputQueue: func.Out[str]):
    try:
        msg_body = msg.get_body().decode("utf-8")
        logging.info('Python Queue trigger processed a message: %s', msg_body)
        messagepayload = json.loads(msg_body)
        logging.info(f'The function receives the following message: {json.dumps(messagepayload)}')
        location = messagepayload["location"]

        # Make request to wttr.in
        wttrUrl = f"https://wttr.in/{location}?format=j1"

        async with httpx.AsyncClient() as client:
            response = await client.get(wttrUrl)
            weather_data = response.json()

        response_message = {
            "Value": weather_data,
            "CorrelationId": messagepayload["CorrelationId"]
        }
        logging.info(f'The function returns the following message through the {outputQueue} queue')

        outputQueue.set(json.dumps(response_message))

    except Exception as e:
        logging.error(f"Error processing message: {e}")
