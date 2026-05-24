#!/usr/bin/env python3
import os
import shutil
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.firefox.options import Options as FirefoxOptions


URL = os.getenv("SELENIUM_STRESS_URL", "http://localhost:3000")
NUM_USERS = int(os.getenv("SELENIUM_STRESS_USERS", "10"))
CONCURRENCY = int(os.getenv("SELENIUM_STRESS_CONCURRENCY", "2"))
WAIT_SECONDS = float(os.getenv("SELENIUM_STRESS_WAIT_SECONDS", "2"))


def create_driver():
    browser = os.getenv("SELENIUM_BROWSER", "auto").lower()

    if browser in ("firefox", "auto") and shutil.which("firefox"):
        options = FirefoxOptions()
        options.add_argument("-headless")
        return webdriver.Firefox(options=options)

    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    return webdriver.Chrome(options=options)


def simulate_user(user_index):
    started_at = time.perf_counter()
    driver = create_driver()

    try:
        driver.get(URL)
        time.sleep(WAIT_SECONDS)
        title = driver.title
        elapsed_ms = (time.perf_counter() - started_at) * 1000

        return {
            "usuario": user_index,
            "sucesso": True,
            "tempo_ms": round(elapsed_ms, 2),
            "titulo": title,
        }
    except Exception as error:
        elapsed_ms = (time.perf_counter() - started_at) * 1000

        return {
            "usuario": user_index,
            "sucesso": False,
            "tempo_ms": round(elapsed_ms, 2),
            "erro": str(error),
        }
    finally:
        driver.quit()


def main():
    print(f"URL testada: {URL}")
    print(f"Usuarios simulados: {NUM_USERS}")
    print(f"Concorrencia: {CONCURRENCY}")

    started_at = time.perf_counter()
    results = []

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
        futures = [executor.submit(simulate_user, index + 1) for index in range(NUM_USERS)]

        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            status = "OK" if result["sucesso"] else "ERRO"
            print(f"Usuario {result['usuario']}: {status} - {result['tempo_ms']} ms")

    total_ms = (time.perf_counter() - started_at) * 1000
    successes = sum(1 for result in results if result["sucesso"])
    failures = NUM_USERS - successes
    average_ms = sum(result["tempo_ms"] for result in results) / len(results)

    print("\nResumo Selenium")
    print(f"Sucessos: {successes}")
    print(f"Falhas: {failures}")
    print(f"Tempo medio: {average_ms:.2f} ms")
    print(f"Tempo total: {total_ms:.2f} ms")


if __name__ == "__main__":
    main()
