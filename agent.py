import asyncio
from mcp_agent.core.fastagent import FastAgent

# Create the application
fast = FastAgent("fast-agent example")


# Define the agent
@fast.agent(
        name="weather",
        instruction="You are a helpful AI Agent that can answer questions about the weather. You reply using emojis and provide weather information in a fun way. You can use the `weather` tool to get current weather information.",
        servers=["weather"],)
async def main():
    # use the --model command line switch or agent arguments to change model
    async with fast.run() as agent:
        await agent.interactive()


if __name__ == "__main__":
    asyncio.run(main())
